/**
 * Complete Workflow Editor - Main editor implementation with proper data flow
 */
class WorkflowEditor {
    constructor(options = {}) {
        this.options = {
            workflowId: null,
            workflowData: { nodes: [], connections: [] },
            csrfToken: null,
            apiBaseUrl: '/workflow/api/workflows/',
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

        // Canvas
        this.canvas = null;

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
        const canvasContainer = document.getElementById('workflow-canvas');
        if (!canvasContainer) {
            console.error('Canvas container not found');
            return;
        }

        this.canvas = new WorkflowCanvas('workflow-canvas');
        
        // Listen to canvas events
        this.canvas.on('nodeAdded', (e) => {
            const { nodeId, node } = e.detail;
            this.nodes.set(nodeId, node);
            this.markDirty();
        });

        this.canvas.on('nodeRemoved', (e) => {
            const { nodeId } = e.detail;
            this.nodes.delete(nodeId);
            this.markDirty();
        });

        this.canvas.on('connectionAdded', (e) => {
            const { connectionId, connection } = e.detail;
            this.connections.set(connectionId, connection);
            this.markDirty();
        });

        this.canvas.on('connectionRemoved', (e) => {
            const { connectionId } = e.detail;
            this.connections.delete(connectionId);
            this.markDirty();
        });

        this.canvas.on('nodeSelected', (e) => {
            const { nodeId } = e.detail;
            this.showNodeProperties(nodeId);
        });

        this.canvas.on('nodeDropped', (e) => {
            const { nodeType, position } = e.detail;
            this.addNodeFromPalette(nodeType, position);
        });
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('save-btn')?.addEventListener('click', () => this.saveWorkflow());
        document.getElementById('test-btn')?.addEventListener('click', () => this.testWorkflow());
        document.getElementById('deploy-btn')?.addEventListener('click', () => this.deployWorkflow());
        
        // Zoom controls
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-fit')?.addEventListener('click', () => this.canvas?.fitToView());
        document.getElementById('center-canvas')?.addEventListener('click', () => this.canvas?.centerView());

        // Node palette
        this.setupNodePalette();

        // Bottom panel tabs
        this.setupBottomPanel();

        // Workflow name/description changes
        document.getElementById('workflow-name')?.addEventListener('change', () => this.markDirty());
        document.getElementById('workflow-description')?.addEventListener('change', () => this.markDirty());

        // Keyboard shortcuts
        document.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    async loadNodeTypes() {
        try {
            const response = await this.apiCall('/workflow/api/node-types/', 'GET');
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
                name: 'schedule_trigger',
                display_name: 'Schedule Trigger',
                category: 'trigger',
                icon: 'fa-clock',
                color: '#f59e0b',
                config_schema: {
                    fields: [
                        { name: 'cron_expression', type: 'text', required: true, label: 'Cron Expression', placeholder: '0 9 * * *' },
                        { name: 'timezone', type: 'select', options: ['UTC', 'America/New_York', 'Europe/London'], default: 'UTC', label: 'Timezone' }
                    ]
                }
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
                        { name: 'conditions', type: 'text', label: 'WHERE Conditions', placeholder: 'user_id = {{input.user_id}}' },
                        { name: 'fields', type: 'text', default: '*', label: 'Fields' },
                        { name: 'limit', type: 'number', default: 100, label: 'Limit' }
                    ]
                }
            },
            {
                name: 'grm_data',
                display_name: 'GRM Data',
                category: 'data',
                icon: 'fa-plane',
                color: '#0ea5e9',
                config_schema: {
                    fields: [
                        { name: 'operation', type: 'select', options: ['get_requests', 'get_passengers', 'get_transactions', 'update_pnr_status'], default: 'get_requests', label: 'Operation' },
                        { name: 'filters', type: 'textarea', label: 'Filters (JSON)', placeholder: '{"status": "active"}' },
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
                        { name: 'field_mappings', type: 'textarea', label: 'Field Mappings (JSON)', placeholder: '[{"source": "old_field", "target": "new_field"}]' }
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
                        { name: 'conditions', type: 'textarea', required: true, label: 'Conditions (JSON)', placeholder: '[{"field": "data.status", "operator": "equals", "value": "active"}]' },
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
                        { name: 'to', type: 'text', required: true, label: 'To Email', placeholder: '{{input.email}}' },
                        { name: 'subject', type: 'text', required: true, label: 'Subject', placeholder: 'Notification: {{input.subject}}' },
                        { name: 'body', type: 'textarea', required: true, label: 'Body', placeholder: 'Dear {{input.name}}, ...' }
                    ]
                }
            },
            {
                name: 'file_write',
                display_name: 'Write File',
                category: 'action',
                icon: 'fa-file-text',
                color: '#6b7280',
                config_schema: {
                    fields: [
                        { name: 'file_path', type: 'text', required: true, label: 'File Path', placeholder: '/tmp/output.txt' },
                        { name: 'content', type: 'textarea', label: 'Content', placeholder: 'File content or {{input.data}}' },
                        { name: 'format', type: 'select', options: ['text', 'json'], default: 'text', label: 'Format' },
                        { name: 'append', type: 'checkbox', default: false, label: 'Append Mode' }
                    ]
                }
            },
            {
                name: 'log',
                display_name: 'Log Message',
                category: 'action',
                icon: 'fa-file-text',
                color: '#6b7280',
                config_schema: {
                    fields: [
                        { name: 'message', type: 'textarea', label: 'Message', placeholder: 'Log: {{input.message}}' },
                        { name: 'level', type: 'select', options: ['info', 'warning', 'error', 'debug'], default: 'info', label: 'Log Level' },
                        { name: 'include_data', type: 'checkbox', default: false, label: 'Include Input Data' }
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

    addNodeFromPalette(nodeTypeName, position) {
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
            input_mapping: {},
            output_mapping: {},
            status: 'idle',
            data: null
        };

        this.nodes.set(nodeId, node);
        this.canvas.nodes.set(nodeId, node);
        this.canvas.renderNode(node);
        this.markDirty();
        return nodeId;
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

    onKeyDown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveWorkflow();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.testWorkflow();
        }
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

        // Data mapping section for better data flow
        html += `
            <div class="form-section">
                <h4>Data Mapping</h4>
                <div class="form-group">
                    <label for="input-mapping">Input Data Mapping</label>
                    <textarea id="input-mapping" name="input_mapping" class="form-control" rows="4" placeholder='{"target_field": "{{previous_node.source_field}}"}'>${JSON.stringify(node.input_mapping || {}, null, 2)}</textarea>
                    <small class="form-help">Map data from previous nodes. Use {{node_id.field_name}} syntax</small>
                </div>
                <div class="form-group">
                    <label for="output-mapping">Output Data Mapping</label>
                    <textarea id="output-mapping" name="output_mapping" class="form-control" rows="4" placeholder='{"output_field": "data.processed_field"}'>${JSON.stringify(node.output_mapping || {}, null, 2)}</textarea>
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

        // Update canvas node
        this.canvas.nodes.set(nodeId, node);
        this.canvas.renderNode(node);
        this.markDirty();
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
                response = await this.apiCall(`/workflow/api/workflows/${this.options.workflowId}/`, 'PUT', workflowData);
            } else {
                response = await this.apiCall('/workflow/api/workflows/', 'POST', workflowData);
                this.options.workflowId = response.id;
                // Update URL without reload
                window.history.replaceState({}, '', `/workflow/workflows/${response.id}/edit/`);
            }

            this.isDirty = false;
            this.updateSaveButton();
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

            const response = await this.apiCall(`/workflow/api/workflows/${this.options.workflowId}/test/`, 'POST', {
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
                    this.canvas.nodes.set(node.id, node);
                    this.canvas.renderNode(node);
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
                const timestamp = new Date().toLocaleTimeString();
                
                logsHtml += `
                    <div class="log-entry ${statusClass}">
                        <div class="log-header">
                            <span class="log-timestamp">${timestamp}</span>
                            <span class="log-level">${nodeExecution.status.toUpperCase()}</span>
                            <span class="log-node">${nodeExecution.node_name}</span>
                        </div>
                        <div class="log-message">${nodeExecution.status === 'success' ? 'Node executed successfully' : (nodeExecution.error_message || 'Node execution failed')}</div>
                        ${nodeExecution.duration_ms ? `<div class="log-duration">Duration: ${nodeExecution.duration_ms}ms</div>` : ''}
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
            this.canvas.nodes.set(node.id, node);
            this.canvas.renderNode(node);
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
            });
        }

        // Load data into canvas
        if (this.canvas) {
            this.canvas.loadWorkflowData({
                nodes: Array.from(this.nodes.values()),
                connections: Array.from(this.connections.values())
            });
        }
    }

    // Utility methods
    generateId() {
        return 'node_' + Math.random().toString(36).substr(2, 9);
    }

    markDirty() {
        this.isDirty = true;
        this.updateSaveButton();
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.innerHTML = this.isDirty ? '<i class="fas fa-save"></i> Save*' : '<i class="fas fa-save"></i> Save';
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

    zoomIn() {
        if (this.canvas) {
            this.canvas.transform.scale = Math.min(3, this.canvas.transform.scale * 1.2);
            this.canvas.updateTransform();
            this.updateZoomDisplay();
        }
    }

    zoomOut() {
        if (this.canvas) {
            this.canvas.transform.scale = Math.max(0.1, this.canvas.transform.scale * 0.8);
            this.canvas.updateTransform();
            this.updateZoomDisplay();
        }
    }

    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel && this.canvas) {
            zoomLevel.textContent = `${Math.round(this.canvas.transform.scale * 100)}%`;
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
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (metaToken) return metaToken;

        const cookieToken = this.getCookie('csrftoken');
        if (cookieToken) return cookieToken;

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