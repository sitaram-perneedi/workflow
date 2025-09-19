/**
 * Data Mapper - Handles data mapping between nodes
 */
class DataMapper {
    constructor() {
        this.mappings = new Map();
        this.availableFields = new Map();
    }

    /**
     * Create a mapping interface for a node
     */
    createMappingInterface(nodeId, sourceNodes, targetConfig) {
        const container = document.createElement('div');
        container.className = 'data-mapper';
        
        let html = `
            <div class="mapper-header">
                <h4>Data Mapping</h4>
                <button class="btn btn-sm btn-primary" onclick="dataMapper.addMapping('${nodeId}')">
                    <i class="fas fa-plus"></i> Add Mapping
                </button>
            </div>
            <div class="mappings-list" id="mappings-${nodeId}">
        `;

        // Show available source fields
        if (sourceNodes.length > 0) {
            html += `
                <div class="source-fields">
                    <h5>Available Fields</h5>
                    <div class="fields-tree">
            `;

            sourceNodes.forEach(sourceNode => {
                if (sourceNode.data) {
                    html += this.renderFieldsTree(sourceNode.id, sourceNode.name, sourceNode.data);
                }
            });

            html += `
                    </div>
                </div>
            `;
        }

        html += `
            </div>
            <div class="mapping-preview">
                <h5>Mapping Preview</h5>
                <pre id="mapping-preview-${nodeId}">No mappings defined</pre>
            </div>
        `;

        container.innerHTML = html;
        return container;
    }

    renderFieldsTree(nodeId, nodeName, data, prefix = '') {
        let html = `<div class="field-group">`;
        html += `<div class="field-group-header">${nodeName}</div>`;

        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                html += `<div class="field-item" data-field="${prefix}${nodeId}" draggable="true">
                    <i class="fas fa-list"></i> Array (${data.length} items)
                </div>`;
                
                if (data.length > 0 && typeof data[0] === 'object') {
                    Object.keys(data[0]).forEach(key => {
                        const fieldPath = `${prefix}${nodeId}.data.0.${key}`;
                        html += `<div class="field-item" data-field="${fieldPath}" draggable="true">
                            <i class="fas fa-tag"></i> ${key}
                        </div>`;
                    });
                }
            } else {
                Object.keys(data).forEach(key => {
                    const fieldPath = `${prefix}${nodeId}.data.${key}`;
                    const value = data[key];
                    
                    if (typeof value === 'object' && value !== null) {
                        html += this.renderFieldsTree(key, key, value, `${prefix}${nodeId}.data.`);
                    } else {
                        html += `<div class="field-item" data-field="${fieldPath}" draggable="true">
                            <i class="fas fa-tag"></i> ${key}
                        </div>`;
                    }
                });
            }
        }

        html += `</div>`;
        return html;
    }

    addMapping(nodeId) {
        const mappingsContainer = document.getElementById(`mappings-${nodeId}`);
        const mappingId = this.generateId();
        
        const mappingElement = document.createElement('div');
        mappingElement.className = 'mapping-item';
        mappingElement.setAttribute('data-mapping-id', mappingId);
        
        mappingElement.innerHTML = `
            <div class="mapping-row">
                <div class="mapping-source">
                    <label>Source Field</label>
                    <input type="text" class="form-control source-field" placeholder="{{previous_node.field_name}}" 
                           onchange="dataMapper.updateMapping('${nodeId}', '${mappingId}')">
                </div>
                <div class="mapping-arrow">
                    <i class="fas fa-arrow-right"></i>
                </div>
                <div class="mapping-target">
                    <label>Target Field</label>
                    <input type="text" class="form-control target-field" placeholder="mapped_field_name"
                           onchange="dataMapper.updateMapping('${nodeId}', '${mappingId}')">
                </div>
                <div class="mapping-actions">
                    <button class="btn btn-sm btn-danger" onclick="dataMapper.removeMapping('${nodeId}', '${mappingId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="mapping-transform">
                <label>Transform (optional)</label>
                <input type="text" class="form-control transform-expression" placeholder="value.toUpperCase()"
                       onchange="dataMapper.updateMapping('${nodeId}', '${mappingId}')">
                <small class="form-help">JavaScript expression to transform the value</small>
            </div>
        `;

        mappingsContainer.appendChild(mappingElement);
    }

    updateMapping(nodeId, mappingId) {
        const mappingElement = document.querySelector(`[data-mapping-id="${mappingId}"]`);
        if (!mappingElement) return;

        const sourceField = mappingElement.querySelector('.source-field').value;
        const targetField = mappingElement.querySelector('.target-field').value;
        const transform = mappingElement.querySelector('.transform-expression').value;

        const mapping = {
            id: mappingId,
            source: sourceField,
            target: targetField,
            transform: transform
        };

        if (!this.mappings.has(nodeId)) {
            this.mappings.set(nodeId, new Map());
        }
        
        this.mappings.get(nodeId).set(mappingId, mapping);
        this.updateMappingPreview(nodeId);
    }

    removeMapping(nodeId, mappingId) {
        const mappingElement = document.querySelector(`[data-mapping-id="${mappingId}"]`);
        if (mappingElement) {
            mappingElement.remove();
        }

        if (this.mappings.has(nodeId)) {
            this.mappings.get(nodeId).delete(mappingId);
            this.updateMappingPreview(nodeId);
        }
    }

    updateMappingPreview(nodeId) {
        const preview = document.getElementById(`mapping-preview-${nodeId}`);
        if (!preview) return;

        const nodeMappings = this.mappings.get(nodeId);
        if (!nodeMappings || nodeMappings.size === 0) {
            preview.textContent = 'No mappings defined';
            return;
        }

        const mappingObject = {};
        nodeMappings.forEach(mapping => {
            if (mapping.source && mapping.target) {
                mappingObject[mapping.target] = mapping.source;
            }
        });

        preview.textContent = JSON.stringify(mappingObject, null, 2);
    }

    getMappingsForNode(nodeId) {
        const nodeMappings = this.mappings.get(nodeId);
        if (!nodeMappings) return {};

        const result = {};
        nodeMappings.forEach(mapping => {
            if (mapping.source && mapping.target) {
                result[mapping.target] = mapping.source;
            }
        });

        return result;
    }

    generateId() {
        return 'mapping_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Apply data transformations based on mappings
     */
    applyMappings(data, mappings) {
        if (!mappings || Object.keys(mappings).length === 0) {
            return data;
        }

        const result = {};
        
        Object.entries(mappings).forEach(([targetField, sourceField]) => {
            const value = this.getNestedValue(data, sourceField);
            this.setNestedValue(result, targetField, value);
        });

        return result;
    }

    getNestedValue(obj, path) {
        if (!path) return obj;
        
        // Handle variable syntax {{node.field}}
        if (path.startsWith('{{') && path.endsWith('}}')) {
            path = path.slice(2, -2);
        }

        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object') {
                return current[key];
            }
            return undefined;
        }, obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key]) {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    }
}

// Export for global use
window.DataMapper = DataMapper;