/**
 * Variable Manager - Handles workflow variables and data mapping
 */
class VariableManager {
    constructor(workflowId) {
        this.workflowId = workflowId;
        this.variables = new Map();
        this.init();
    }

    init() {
        this.loadVariables();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add variable button
        document.getElementById('add-variable')?.addEventListener('click', () => {
            this.showAddVariableModal();
        });

        // Variable form submission
        document.getElementById('variable-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveVariable();
        });
    }

    async loadVariables() {
        try {
            const response = await fetch(`/workflow/api/variables/?workflow=${this.workflowId}`, {
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const variables = await response.json();
                variables.results.forEach(variable => {
                    this.variables.set(variable.name, variable);
                });
                this.renderVariablesList();
            }
        } catch (error) {
            console.error('Failed to load variables:', error);
        }
    }

    renderVariablesList() {
        const container = document.getElementById('variables-list');
        if (!container) return;

        let html = '';
        this.variables.forEach(variable => {
            html += `
                <div class="variable-item" data-variable-id="${variable.id}">
                    <div class="variable-info">
                        <div class="variable-name">${variable.name}</div>
                        <div class="variable-value">${variable.is_secret ? '***HIDDEN***' : variable.value}</div>
                        <div class="variable-scope">${variable.scope}</div>
                    </div>
                    <div class="variable-actions">
                        <button class="btn btn-sm btn-outline" onclick="editVariable('${variable.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteVariable('${variable.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = '<div class="empty-message">No variables defined</div>';
        }

        container.innerHTML = html;
    }

    showAddVariableModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Variable</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="variable-form">
                        <div class="form-group">
                            <label for="var-name">Variable Name</label>
                            <input type="text" id="var-name" name="name" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="var-value">Value</label>
                            <textarea id="var-value" name="value" required class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="var-scope">Scope</label>
                            <select id="var-scope" name="scope" class="form-control">
                                <option value="workflow">Workflow</option>
                                <option value="global">Global</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="is_secret"> Secret Variable
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="var-description">Description</label>
                            <textarea id="var-description" name="description" class="form-control" rows="2"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="variableManager.saveVariable()">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    async saveVariable() {
        const form = document.getElementById('variable-form');
        const formData = new FormData(form);
        
        const variableData = {
            name: formData.get('name'),
            value: formData.get('value'),
            scope: formData.get('scope'),
            is_secret: formData.has('is_secret'),
            description: formData.get('description'),
            workflow: this.workflowId
        };

        try {
            const response = await fetch('/workflow/api/variables/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'same-origin',
                body: JSON.stringify(variableData)
            });

            if (response.ok) {
                const variable = await response.json();
                this.variables.set(variable.name, variable);
                this.renderVariablesList();
                document.querySelector('.modal').remove();
                this.showNotification('Variable saved successfully', 'success');
            } else {
                throw new Error('Failed to save variable');
            }
        } catch (error) {
            console.error('Error saving variable:', error);
            this.showNotification('Failed to save variable', 'error');
        }
    }

    getCsrfToken() {
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (metaToken) return metaToken;

        const cookieToken = this.getCookie('csrftoken');
        return cookieToken || '';
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
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

// Global functions
function editVariable(variableId) {
    // Implementation for editing variables
    console.log('Edit variable:', variableId);
}

function deleteVariable(variableId) {
    if (confirm('Are you sure you want to delete this variable?')) {
        fetch(`/workflow/api/variables/${variableId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': variableManager.getCsrfToken()
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (response.ok) {
                variableManager.variables.delete(variableId);
                variableManager.renderVariablesList();
                variableManager.showNotification('Variable deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete variable');
            }
        })
        .catch(error => {
            console.error('Error deleting variable:', error);
            variableManager.showNotification('Failed to delete variable', 'error');
        });
    }
}

// Export for global use
window.VariableManager = VariableManager;