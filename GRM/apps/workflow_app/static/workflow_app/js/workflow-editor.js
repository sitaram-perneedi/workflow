/**
 * Complete Workflow Editor - Main editor implementation
 */
class WorkflowEditor {
    constructor(options = {}) {
        this.options = {
            workflowId: null,
            workflowData: { nodes: [], connections: [] },
            csrfToken: null,
            apiBaseUrl: '/api/workflows/',
            autoSave: true,
            ...options
        };

        // State
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNodes = new Set();
        this.selectedConnections = new Set();
        this.nodeTypes = new Map();
        this.isDirty = false;
        this.isLoading = false;
        this.executionResults = new Map();

        // Canvas state
        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDragging = false;
        this.isConnecting = false;
        this.connectionStart = null;
        this.dragOffset = { x: 0, y: 0 };
        this.lastMousePos = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.loadNodeTypes();
        this.loadWorkflowData();
        this.setupAutoSave();
    }

    setupCanvas() {
        const canvas = document.getElementById('workflow-canvas');
        canvas.innerHTML = `
            <div class="canvas-grid"></div>
            <svg class="connections-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                    </marker>
                </defs>
            </svg>
            <div class="nodes-container" style="position: relative; z-index: 2;"></div>
        `;

        this.connectionsLayer = canvas.querySelector('.connections-svg');
        this.nodesContainer = canvas.querySelector('.nodes-container');
        this.gridLayer = canvas.querySelector('.canvas-grid');
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveWorkflow());
        document.getElementById('test-btn')?.addEventListener('click', () => this.testWorkflow());
        document.getElementById('deploy-btn')?.addEventListener('click', () => this.deployWorkflow());
        
        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-fit')?.addEventListener('click', () => this.fitToView());
        document.getElementById('center-canvas')?.addEventListener('click', () => this.centerView());

        // Canvas events
        const canvas = document.getElementById('workflow-canvas');
        canvas.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onCanvasMouseUp.bind(this));
        canvas.addEventListener('wheel', this.onCanvasWheel.bind(this));
        canvas.addEventListener('dragover', this.onCanvasDragOver.bind(this));
        canvas.addEventListener('drop', this.onCanvasDrop.bind(this));

        // Node palette
        this.setupNodePalette();

        // Properties panel
        this.setupPropertiesPanel();

        // Bottom panel tabs
        this.setupBottomPanel();

        // Workflow name/description changes
        document.getElementById('workflow-name')?.addEventListener('change', (e) => {
            this.markDirty();
        });
        document.getElementById('workflow-description')?.addEventListener('change', (e) => {
            this.markDirty();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    async loadNodeTypes() {
        try {
            const response = await this.apiCall('/api/node-types/', 'GET');
            response.forEach(nodeType => {
                this.nodeTypes.set(nodeType.name, nodeType);
            });
            this.populateNodePalette();
        } catch (error) {
            console.error('Failed to load node types:', error);
            this.loadDefaultNodeTypes();
        }
    }

    loadDefaultNodeTypes() {
        const defaultTypes = [
            {
                name: 'manual_trigger',
                display_name: 'Manual Trigger',
                category: 'trigger',
                icon: 'fa-hand-pointer',
                color: '#10b981',
                config_schema: { fields: [] }
            },
            {
                name: 'database_query',
                display_name: 'Database Query',
                category: 'data',
                icon: 'fa-database',
                color: '#8b5cf6',
                config_schema: {
                    fields: [
                        { name: 'query_type', type: 'select', options: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], default: 'SELECT', label: 'Query Type' },
                        { name: 'table_name', type: 'text', required: true, label: 'Table Name' },
                        { name: 'conditions', type: 'text', label: 'WHERE Conditions' },
                        { name: 'fields', type: 'text', default: '*', label: 'Fields' },
                        { name: 'limit', type: 'number', default: 100, label: 'Limit' }
                    ]
                }
            },
            {
                name: 'data_transform',
                display_name: 'Data Transform',
                category: 'transform',
                icon: 'fa-exchange-alt',
                color: '#059669',
                config_schema: {
                    fields: [
                        { name: 'transform_type', type: 'select', options: ['map', 'filter', 'aggregate'], default: 'map', label: 'Transform Type' },
                        { name: 'field_mappings', type: 'textarea', label: 'Field Mappings (JSON)' }
                    ]
                }
            },
            {
                name: 'condition',
                display_name: 'Condition',
                category: 'condition',
                icon: 'fa-code-branch',
                color: '#ef4444',
                config_schema: {
                    fields: [
                        { name: 'conditions', type: 'textarea', required: true, label: 'Conditions (JSON)' },
                        { name: 'logic_operator', type: 'select', options: ['AND', 'OR'], default: 'AND', label: 'Logic Operator' }
                    ]
                }
            },
            {
                name: 'email_send',
                display_name: 'Send Email',
                category: 'action',
                icon: 'fa-envelope',
                color: '#06b6d4',
                config_schema: {
                    fields: [
                        { name: 'to', type: 'text', required: true, label: 'To Email' },
                        { name: 'subject', type: 'text', required: true, label: 'Subject' },
                        { name: 'body', type: 'textarea', required: true, label: 'Body' }
                    ]
                }
            }
        ];

        defaultTypes.forEach(nodeType => {
            this.nodeTypes.set(nodeType.name, nodeType);
        });
        this.populateNodePalette();
    }

    populateNodePalette() {
        const categories = this.groupNodesByCategory();
        
        Object.entries(categories).forEach(([category, nodes]) => {
            const categoryElement = document.querySelector(`[data-category="${category}"] .category-nodes`);
            if (categoryElement) {
                categoryElement.innerHTML = '';
                nodes.forEach(nodeType => {
                    const nodeElement = this.createPaletteNode(nodeType);
                    categoryElement.appendChild(nodeElement);
                });
            }
        });
    }

    groupNodesByCategory() {
        const categories = {};
        this.nodeTypes.forEach(nodeType => {
            const category = nodeType.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(nodeType);
        });
        return categories;
    }

    createPaletteNode(nodeType) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'palette-node';
        nodeDiv.draggable = true;
        nodeDiv.setAttribute('data-node-type', nodeType.name);
        nodeDiv.title = nodeType.description || nodeType.display_name;

        nodeDiv.innerHTML = `
            <div class="node-icon" style="background-color: ${nodeType.color}">
                <i class="fas ${nodeType.icon}"></i>
            </div>
            <span class="node-name">${nodeType.display_name}</span>
        `;

        nodeDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', nodeType.name);
            e.dataTransfer.setData('application/json', JSON.stringify(nodeType));
        });

        return nodeDiv;
    }

    setupNodePalette() {
        // Category toggle functionality
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const category = header.closest('.node-category');
                category.classList.toggle('collapsed');
            });
        });

        // Search functionality
        const searchInput = document.getElementById('node-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterNodes(e.target.value);
            });
        }
    }

    filterNodes(searchTerm) {
        const term = searchTerm.toLowerCase();
        document.querySelectorAll('.palette-node').forEach(node => {
            const name = node.querySelector('.node-name').textContent.toLowerCase();
            const matches = name.includes(term);
            node.style.display = matches ? 'flex' : 'none';
        });
    }

    setupPropertiesPanel() {
        // Properties panel will be populated when nodes are selected
    }

    setupBottomPanel() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Clear logs button
        document.getElementById('clear-logs')?.addEventListener('click', () => {
            document.getElementById('execution-logs').innerHTML = `
                <div class="log-placeholder">
                    <i class="fas fa-info-circle"></i>
                    <p>Logs cleared</p>
                </div>
            `;
        });
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    // Canvas event handlers
    onCanvasMouseDown(e) {
        if (e.target.classList.contains('workflow-canvas') || e.target.classList.contains('canvas-grid')) {
            this.clearSelection();
            this.isPanning = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            e.target.style.cursor = 'grabbing';
        }
    }

    onCanvasMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;
            this.transform.x += dx;
            this.transform.y += dy;
            this.updateTransform();
            this.lastMousePos = { x: e.clientX, y: e.clientY };
        }

        if (this.isDragging && this.selectedNodes.size > 0) {
            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;

            this.selectedNodes.forEach(nodeId => {
                const node = this.nodes.get(nodeId);
                if (node) {
                    node.position.x += dx / this.transform.scale;
                    node.position.y += dy / this.transform.scale;
                    this.renderNode(node);
                }
            });

            this.renderConnections();
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.markDirty();
        }

        if (this.isConnecting && this.connectionStart) {
            this.updateTempConnection(e);
        }
    }

    onCanvasMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            e.target.style.cursor = 'grab';
        }

        if (this.isDragging) {
            this.isDragging = false;
        }

        if (this.isConnecting) {
            this.finishConnection(e);
        }
    }

    onCanvasWheel(e) {
        e.preventDefault();
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(3, this.transform.scale * scaleFactor));
        
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleChange = newScale / this.transform.scale;
        this.transform.x = mouseX - (mouseX - this.transform.x) * scaleChange;
        this.transform.y = mouseY - (mouseY - this.transform.y) * scaleChange;
        this.transform.scale = newScale;

        this.updateTransform();
        this.updateZoomDisplay();
    }

    onCanvasDragOver(e) {
        e.preventDefault();
    }

    onCanvasDrop(e) {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('text/plain');
        if (!nodeType) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.transform.x) / this.transform.scale;
        const y = (e.clientY - rect.top - this.transform.y) / this.transform.scale;

        this.addNode(nodeType, { x, y });
    }

    onKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelected();
        } else if (e.key === 'Escape') {
            this.clearSelection();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveWorkflow();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.testWorkflow();
        }
    }

    // Node management
    addNode(nodeTypeName, position) {
        const nodeType = this.nodeTypes.get(nodeTypeName);
        if (!nodeType) {
            console.error('Unknown node type:', nodeTypeName);
            return;
        }

        const nodeId = this.generateId();
        const node = {
            id: nodeId,
            type: nodeTypeName,
            name: nodeType.display_name,
            position: position || { x: 100, y: 100 },
            config: {},
            data: null,
            status: 'idle'
        };

        this.nodes.set(nodeId, node);
        this.renderNode(node);
        this.markDirty();
        return nodeId;
    }

    removeNode(nodeId) {
        // Remove connections
        const connectionsToRemove = [];
        this.connections.forEach((connection, id) => {
            if (connection.source === nodeId || connection.target === nodeId) {
                connectionsToRemove.push(id);
            }
        });

        connectionsToRemove.forEach(id => this.removeConnection(id));

        // Remove node
        this.nodes.delete(nodeId);
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.remove();
        }

        this.selectedNodes.delete(nodeId);
        this.markDirty();
    }

    renderNode(node) {
        let nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
        
        if (!nodeElement) {
            nodeElement = document.createElement('div');
            nodeElement.className = 'workflow-node';
            nodeElement.setAttribute('data-node-id', node.id);
            this.nodesContainer.appendChild(nodeElement);
        }

        const nodeType = this.nodeTypes.get(node.type);
        const isSelected = this.selectedNodes.has(node.id);

        nodeElement.className = `workflow-node ${isSelected ? 'selected' : ''} status-${node.status}`;
        nodeElement.style.left = `${node.position.x}px`;
        nodeElement.style.top = `${node.position.y}px`;

        nodeElement.innerHTML = `
            <div class="node-header" style="background-color: ${nodeType?.color || '#6b7280'}">
                <div class="node-icon">
                    <i class="fas ${nodeType?.icon || 'fa-cube'}"></i>
                </div>
                <div class="node-title">${node.name}</div>
                <div class="node-status ${node.status}"></div>
            </div>
            <div class="node-body">
                ${this.getNodeDescription(node)}
                ${node.data ? this.renderNodeData(node.data) : ''}
            </div>
            <div class="node-handles">
                <div class="node-handle input" data-handle="input"></div>
                <div class="node-handle output" data-handle="output"></div>
            </div>
        `;

        // Add event listeners
        nodeElement.addEventListener('mousedown', (e) => this.onNodeMouseDown(e, node.id));
        nodeElement.addEventListener('click', (e) => this.onNodeClick(e, node.id));

        // Handle events
        nodeElement.querySelectorAll('.node-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, node.id, handle));
        });
    }

    getNodeDescription(node) {
        const config = node.config || {};
        const keys = Object.keys(config);
        
        if (keys.length === 0) {
            return '<span class="text-muted">Click to configure</span>';
        }

        const firstKey = keys[0];
        const value = config[firstKey];
        return `<small>${firstKey}: ${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}</small>`;
    }

    renderNodeData(data) {
        if (!data) return '';
        
        let preview = '';
        if (typeof data === 'object') {
            if (Array.isArray(data)) {
                preview = `Array (${data.length} items)`;
            } else {
                const keys = Object.keys(data);
                preview = `Object (${keys.length} keys)`;
            }
        } else {
            preview = String(data).substring(0, 50);
        }

        return `
            <div class="node-data-preview">
                <small><i class="fas fa-database"></i> ${preview}</small>
            </div>
        `;
    }

    onNodeMouseDown(e, nodeId) {
        e.stopPropagation();
        
        if (!this.selectedNodes.has(nodeId)) {
            if (!e.ctrlKey && !e.metaKey) {
                this.clearSelection();
            }
            this.selectNode(nodeId);
        }

        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
    }

    onNodeClick(e, nodeId) {
        e.stopPropagation();
        this.showNodeProperties(nodeId);
    }

    onHandleMouseDown(e, nodeId, handleElement) {
        e.stopPropagation();
        
        const handleType = handleElement.classList.contains('input') ? 'input' : 'output';
        const handleName = handleElement.getAttribute('data-handle');

        if (handleType === 'output') {
            this.startConnection(nodeId, handleName, e);
        }
    }

    // Connection management
    startConnection(sourceNodeId, sourceHandle, e) {
        this.isConnecting = true;
        this.connectionStart = {
            nodeId: sourceNodeId,
            handle: sourceHandle
        };

        this.createTempConnection();
    }

    createTempConnection() {
        let tempLine = this.connectionsLayer.querySelector('.temp-connection');
        if (!tempLine) {
            tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempLine.setAttribute('class', 'temp-connection');
            tempLine.setAttribute('stroke', '#999');
            tempLine.setAttribute('stroke-width', '2');
            tempLine.setAttribute('stroke-dasharray', '5,5');
            tempLine.setAttribute('fill', 'none');
            this.connectionsLayer.appendChild(tempLine);
        }
    }

    updateTempConnection(e) {
        const tempLine = this.connectionsLayer.querySelector('.temp-connection');
        if (!tempLine || !this.connectionStart) return;

        const sourceNode = this.nodes.get(this.connectionStart.nodeId);
        const sourcePos = this.getHandlePosition(sourceNode, this.connectionStart.handle, 'output');
        
        const rect = document.getElementById('workflow-canvas').getBoundingClientRect();
        const endPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const path = this.createConnectionPath(sourcePos, endPos);
        tempLine.setAttribute('d', path);
    }

    finishConnection(e) {
        this.isConnecting = false;

        // Remove temp connection
        const tempLine = this.connectionsLayer.querySelector('.temp-connection');
        if (tempLine) {
            tempLine.remove();
        }

        // Find target handle
        const target = e.target;
        if (target && target.classList.contains('node-handle') && target.classList.contains('input')) {
            const targetNodeId = target.closest('.workflow-node').getAttribute('data-node-id');
            const targetHandle = target.getAttribute('data-handle');

            if (this.connectionStart && targetNodeId !== this.connectionStart.nodeId) {
                this.addConnection(this.connectionStart.nodeId, this.connectionStart.handle, targetNodeId, targetHandle);
            }
        }

        this.connectionStart = null;
    }

    addConnection(sourceNodeId, sourceHandle, targetNodeId, targetHandle) {
        const connectionId = this.generateId();
        const connection = {
            id: connectionId,
            source: sourceNodeId,
            sourceHandle: sourceHandle,
            target: targetNodeId,
            targetHandle: targetHandle
        };

        this.connections.set(connectionId, connection);
        this.renderConnection(connection);
        this.markDirty();
        return connectionId;
    }

    removeConnection(connectionId) {
        this.connections.delete(connectionId);
        const connectionElement = this.connectionsLayer.querySelector(`[data-connection-id="${connectionId}"]`);
        if (connectionElement) {
            connectionElement.remove();
        }
        this.selectedConnections.delete(connectionId);
        this.markDirty();
    }

    renderConnection(connection) {
        const sourceNode = this.nodes.get(connection.source);
        const targetNode = this.nodes.get(connection.target);

        if (!sourceNode || !targetNode) return;

        const sourcePos = this.getHandlePosition(sourceNode, connection.sourceHandle, 'output');
        const targetPos = this.getHandlePosition(targetNode, connection.targetHandle, 'input');

        let connectionElement = this.connectionsLayer.querySelector(`[data-connection-id="${connection.id}"]`);

        if (!connectionElement) {
            connectionElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            connectionElement.setAttribute('data-connection-id', connection.id);
            connectionElement.setAttribute('class', 'connection-line');
            connectionElement.setAttribute('marker-end', 'url(#arrowhead)');
            connectionElement.setAttribute('stroke', '#3b82f6');
            connectionElement.setAttribute('stroke-width', '2');
            connectionElement.setAttribute('fill', 'none');
            this.connectionsLayer.appendChild(connectionElement);

            connectionElement.addEventListener('click', (e) => this.onConnectionClick(e, connection.id));
        }

        const path = this.createConnectionPath(sourcePos, targetPos);
        connectionElement.setAttribute('d', path);
    }

    getHandlePosition(node, handleName, type) {
        const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
        if (!nodeElement) return { x: 0, y: 0 };

        const handle = nodeElement.querySelector(`.node-handle.${type}[data-handle="${handleName}"]`);
        if (!handle) return { x: 0, y: 0 };

        const nodeRect = nodeElement.getBoundingClientRect();
        const handleRect = handle.getBoundingClientRect();
        const canvasRect = document.getElementById('workflow-canvas').getBoundingClientRect();

        return {
            x: handleRect.left + handleRect.width / 2 - canvasRect.left,
            y: handleRect.top + handleRect.height / 2 - canvasRect.top
        };
    }

    createConnectionPath(start, end) {
        const dx = end.x - start.x;
        const controlOffset = Math.max(50, Math.abs(dx) * 0.5);

        return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;
    }

    onConnectionClick(e, connectionId) {
        e.stopPropagation();
        this.clearSelection();
        this.selectConnection(connectionId);
    }

    renderConnections() {
        this.connections.forEach(connection => {
            this.renderConnection(connection);
        });
    }

    // Selection management
    selectNode(nodeId) {
        this.selectedNodes.add(nodeId);
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
        this.showNodeProperties(nodeId);
    }

    selectConnection(connectionId) {
        this.selectedConnections.add(connectionId);
        const connectionElement = this.connectionsLayer.querySelector(`[data-connection-id="${connectionId}"]`);
        if (connectionElement) {
            connectionElement.classList.add('selected');
        }
    }

    clearSelection() {
        this.selectedNodes.forEach(nodeId => {
            const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (nodeElement) {
                nodeElement.classList.remove('selected');
            }
        });
        this.selectedNodes.clear();

        this.selectedConnections.forEach(connectionId => {
            const connectionElement = this.connectionsLayer.querySelector(`[data-connection-id="${connectionId}"]`);
            if (connectionElement) {
                connectionElement.classList.remove('selected');
            }
        });
        this.selectedConnections.clear();

        this.hideProperties();
    }

    deleteSelected() {
        this.selectedConnections.forEach(connectionId => {
            this.removeConnection(connectionId);
        });

        this.selectedNodes.forEach(nodeId => {
            this.removeNode(nodeId);
        });
    }

    // Properties panel
    showNodeProperties(nodeId) {
        const node = this.nodes.get(nodeId);
        const nodeType = this.nodeTypes.get(node.type);
        
        if (!node || !nodeType) return;

        document.getElementById('panel-title').textContent = node.name;
        document.getElementById('no-selection').style.display = 'none';
        document.getElementById('node-properties').style.display = 'block';
        document.getElementById('connection-properties').style.display = 'none';

        const propertiesContainer = document.getElementById('node-properties');
        propertiesContainer.innerHTML = this.generateNodePropertiesForm(node, nodeType);

        this.setupFormEventListeners(propertiesContainer, nodeId);
    }

    generateNodePropertiesForm(node, nodeType) {
        let html = `
            <div class="form-section">
                <h4>General</h4>
                <div class="form-group">
                    <label for="node-name">Node Name</label>
                    <input type="text" id="node-name" name="name" value="${node.name}" class="form-control">
                </div>
            </div>
        `;

        if (nodeType.config_schema && nodeType.config_schema.fields) {
            html += `<div class="form-section"><h4>Configuration</h4>`;

            nodeType.config_schema.fields.forEach(field => {
                const value = node.config[field.name] || field.default || '';
                html += this.generateFormField(field, value);
            });

            html += `</div>`;
        }

        // Data mapping section
        html += `
            <div class="form-section">
                <h4>Data Mapping</h4>
                <div class="form-group">
                    <label for="input-mapping">Input Data Mapping</label>
                    <textarea id="input-mapping" name="input_mapping" class="form-control" rows="4" placeholder="Map input data fields (JSON format)">${JSON.stringify(node.input_mapping || {}, null, 2)}</textarea>
                    <small class="form-help">Map data from previous nodes. Use {{previous_node_id.field_name}} syntax</small>
                </div>
                <div class="form-group">
                    <label for="output-mapping">Output Data Mapping</label>
                    <textarea id="output-mapping" name="output_mapping" class="form-control" rows="4" placeholder="Map output data fields (JSON format)">${JSON.stringify(node.output_mapping || {}, null, 2)}</textarea>
                    <small class="form-help">Transform output data structure</small>
                </div>
            </div>
        `;

        // Show data preview if available
        if (node.data) {
            html += `
                <div class="form-section">
                    <h4>Data Preview</h4>
                    <div class="data-preview">
                        <pre>${JSON.stringify(node.data, null, 2)}</pre>
                    </div>
                </div>
            `;
        }

        return html;
    }

    generateFormField(field, value) {
        const fieldId = `field-${field.name}`;
        const required = field.required ? 'required' : '';
        const placeholder = field.placeholder || '';

        let html = `<div class="form-group">`;
        html += `<label for="${fieldId}">${field.label || this.formatFieldName(field.name)}</label>`;

        switch (field.type) {
            case 'text':
                html += `<input type="text" id="${fieldId}" name="${field.name}" value="${value}" placeholder="${placeholder}" class="form-control" ${required}>`;
                break;
            case 'number':
                html += `<input type="number" id="${fieldId}" name="${field.name}" value="${value}" placeholder="${placeholder}" class="form-control" ${required}>`;
                break;
            case 'textarea':
                html += `<textarea id="${fieldId}" name="${field.name}" placeholder="${placeholder}" class="form-control" rows="3" ${required}>${value}</textarea>`;
                break;
            case 'select':
                html += `<select id="${fieldId}" name="${field.name}" class="form-control" ${required}>`;
                if (!field.required) {
                    html += `<option value="">-- Select --</option>`;
                }
                field.options.forEach(option => {
                    const selected = value === option ? 'selected' : '';
                    html += `<option value="${option}" ${selected}>${option}</option>`;
                });
                html += `</select>`;
                break;
            case 'checkbox':
                const checked = value === true || value === 'true' ? 'checked' : '';
                html += `<label class="checkbox-label">
                    <input type="checkbox" id="${fieldId}" name="${field.name}" ${checked}>
                    ${field.label || this.formatFieldName(field.name)}
                </label>`;
                break;
            default:
                html += `<input type="text" id="${fieldId}" name="${field.name}" value="${value}" placeholder="${placeholder}" class="form-control" ${required}>`;
        }

        if (field.help) {
            html += `<small class="form-help">${field.help}</small>`;
        }

        html += `</div>`;
        return html;
    }

    setupFormEventListeners(container, nodeId) {
        const formElements = container.querySelectorAll('input, select, textarea');
        
        formElements.forEach(element => {
            element.addEventListener('change', (e) => {
                this.handleFieldChange(e.target, nodeId);
            });

            element.addEventListener('input', (e) => {
                if (e.target.type === 'text' || e.target.tagName === 'TEXTAREA') {
                    clearTimeout(this.inputTimeout);
                    this.inputTimeout = setTimeout(() => {
                        this.handleFieldChange(e.target, nodeId);
                    }, 500);
                }
            });
        });
    }

    handleFieldChange(element, nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        const fieldName = element.name;
        let fieldValue = element.value;

        if (element.type === 'checkbox') {
            fieldValue = element.checked;
        } else if (element.type === 'number') {
            fieldValue = element.value ? Number(element.value) : null;
        } else if (fieldName === 'input_mapping' || fieldName === 'output_mapping') {
            try {
                fieldValue = fieldValue ? JSON.parse(fieldValue) : {};
            } catch (e) {
                console.warn('Invalid JSON in field:', fieldName);
                return;
            }
        }

        if (fieldName === 'name') {
            node.name = fieldValue;
        } else if (fieldName === 'input_mapping') {
            node.input_mapping = fieldValue;
        } else if (fieldName === 'output_mapping') {
            node.output_mapping = fieldValue;
        } else {
            if (!node.config) {
                node.config = {};
            }
            node.config[fieldName] = fieldValue;
        }

        this.renderNode(node);
        this.markDirty();
    }

    hideProperties() {
        document.getElementById('panel-title').textContent = 'Properties';
        document.getElementById('no-selection').style.display = 'flex';
        document.getElementById('node-properties').style.display = 'none';
        document.getElementById('connection-properties').style.display = 'none';
    }

    formatFieldName(name) {
        return name.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Workflow operations
    async saveWorkflow() {
        try {
            this.showLoading('Saving workflow...');

            const workflowData = {
                name: document.getElementById('workflow-name')?.value || 'Untitled Workflow',
                description: document.getElementById('workflow-description')?.value || '',
                definition: this.getWorkflowDefinition()
            };

            let response;
            if (this.options.workflowId) {
                response = await this.apiCall(`/api/workflows/${this.options.workflowId}/`, 'PUT', workflowData);
            } else {
                response = await this.apiCall('/api/workflows/', 'POST', workflowData);
                this.options.workflowId = response.id;
            }

            this.isDirty = false;
            this.showNotification('Workflow saved successfully', 'success');
            
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Failed to save workflow: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async testWorkflow() {
        if (!this.options.workflowId) {
            await this.saveWorkflow();
        }

        try {
            this.showLoading('Testing workflow...');
            this.clearExecutionResults();

            const response = await this.apiCall(`/api/workflows/${this.options.workflowId}/test/`, 'POST', {
                input_data: {}
            });

            this.displayTestResults(response);
            this.showNotification('Workflow test completed', 'success');

        } catch (error) {
            console.error('Test error:', error);
            this.showNotification('Workflow test failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayTestResults(results) {
        // Update node statuses and data
        if (results.node_executions) {
            results.node_executions.forEach(nodeExecution => {
                const node = this.nodes.get(nodeExecution.node_id);
                if (node) {
                    node.status = nodeExecution.status;
                    node.data = nodeExecution.output_data;
                    this.renderNode(node);
                }
            });
        }

        // Show execution logs
        this.displayExecutionLogs(results);
        this.switchTab('logs');
    }

    displayExecutionLogs(results) {
        const logsContainer = document.getElementById('execution-logs');
        let logsHtml = '';

        if (results.node_executions && results.node_executions.length > 0) {
            results.node_executions.forEach(nodeExecution => {
                const statusClass = nodeExecution.status === 'success' ? 'log-info' : 'log-error';
                logsHtml += `
                    <div class="log-entry ${statusClass}">
                        <span class="log-timestamp">${new Date().toLocaleTimeString()}</span>
                        <span class="log-level">${nodeExecution.status.toUpperCase()}</span>
                        <span class="log-node">${nodeExecution.node_name}</span>
                        <span class="log-message">Node executed successfully</span>
                        ${nodeExecution.duration_ms ? `<span class="log-duration">${nodeExecution.duration_ms}ms</span>` : ''}
                    </div>
                `;
            });
        } else {
            logsHtml = `
                <div class="log-placeholder">
                    <i class="fas fa-info-circle"></i>
                    <p>No execution logs available</p>
                </div>
            `;
        }

        logsContainer.innerHTML = logsHtml;
    }

    clearExecutionResults() {
        this.nodes.forEach(node => {
            node.status = 'idle';
            node.data = null;
            this.renderNode(node);
        });
    }

    getWorkflowDefinition() {
        const nodes = [];
        const connections = [];

        this.nodes.forEach(node => {
            nodes.push({
                id: node.id,
                type: node.type,
                name: node.name,
                position: node.position,
                config: node.config || {},
                input_mapping: node.input_mapping || {},
                output_mapping: node.output_mapping || {}
            });
        });

        this.connections.forEach(connection => {
            connections.push({
                source: connection.source,
                target: connection.target,
                source_output: connection.sourceHandle || 'main',
                target_input: connection.targetHandle || 'main'
            });
        });

        return { nodes, connections };
    }

    loadWorkflowData() {
        if (this.options.workflowData && this.options.workflowData.nodes) {
            this.options.workflowData.nodes.forEach(nodeData => {
                const nodeId = nodeData.id || this.generateId();
                const node = {
                    id: nodeId,
                    type: nodeData.type,
                    name: nodeData.name,
                    position: nodeData.position || { x: 100, y: 100 },
                    config: nodeData.config || {},
                    input_mapping: nodeData.input_mapping || {},
                    output_mapping: nodeData.output_mapping || {},
                    status: 'idle',
                    data: null
                };
                this.nodes.set(nodeId, node);
                this.renderNode(node);
            });
        }

        if (this.options.workflowData && this.options.workflowData.connections) {
            this.options.workflowData.connections.forEach(connectionData => {
                const connectionId = this.generateId();
                const connection = {
                    id: connectionId,
                    source: connectionData.source,
                    target: connectionData.target,
                    sourceHandle: connectionData.source_output || 'output',
                    targetHandle: connectionData.target_input || 'input'
                };
                this.connections.set(connectionId, connection);
                this.renderConnection(connection);
            });
        }
    }

    // Utility methods
    generateId() {
        return 'node_' + Math.random().toString(36).substr(2, 9);
    }

    updateTransform() {
        const transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
        this.nodesContainer.style.transform = transform;
        this.connectionsLayer.style.transform = transform;
    }

    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.transform.scale * 100)}%`;
        }
    }

    zoomIn() {
        this.transform.scale = Math.min(3, this.transform.scale * 1.2);
        this.updateTransform();
        this.updateZoomDisplay();
    }

    zoomOut() {
        this.transform.scale = Math.max(0.1, this.transform.scale * 0.8);
        this.updateTransform();
        this.updateZoomDisplay();
    }

    centerView() {
        if (this.nodes.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + 200);
            maxY = Math.max(maxY, node.position.y + 100);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const containerRect = document.getElementById('workflow-canvas').getBoundingClientRect();
        this.transform.x = containerRect.width / 2 - centerX * this.transform.scale;
        this.transform.y = containerRect.height / 2 - centerY * this.transform.scale;

        this.updateTransform();
    }

    fitToView() {
        if (this.nodes.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + 200);
            maxY = Math.max(maxY, node.position.y + 100);
        });

        const workflowWidth = maxX - minX;
        const workflowHeight = maxY - minY;

        const containerRect = document.getElementById('workflow-canvas').getBoundingClientRect();
        const scaleX = (containerRect.width - 100) / workflowWidth;
        const scaleY = (containerRect.height - 100) / workflowHeight;

        this.transform.scale = Math.min(scaleX, scaleY, 1);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        this.transform.x = containerRect.width / 2 - centerX * this.transform.scale;
        this.transform.y = containerRect.height / 2 - centerY * this.transform.scale;

        this.updateTransform();
        this.updateZoomDisplay();
    }

    markDirty() {
        this.isDirty = true;
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save*';
        }
    }

    setupAutoSave() {
        if (this.options.autoSave) {
            setInterval(() => {
                if (this.isDirty && !this.isLoading) {
                    this.saveWorkflow();
                }
            }, 30000); // Auto-save every 30 seconds
        }
    }

    // API helper
    async apiCall(url, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
        };

        const config = {
            method,
            headers,
            credentials: 'same-origin'
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    getCsrfToken() {
        // Try multiple methods to get CSRF token
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (metaToken) return metaToken;

        const cookieToken = this.getCookie('csrftoken');
        if (cookieToken) return cookieToken;

        const inputToken = document.querySelector('[name="csrfmiddlewaretoken"]')?.value;
        if (inputToken) return inputToken;

        return this.options.csrfToken || '';
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.style.display = 'flex';
        }
        this.isLoading = true;
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        this.isLoading = false;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Export for global use
window.WorkflowEditor = WorkflowEditor;