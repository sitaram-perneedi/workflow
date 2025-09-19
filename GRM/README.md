# GRM Workflow System

A complete no-code workflow automation system built with Django, featuring visual workflow editor, scheduling, and GRM-specific integrations.

## Features

- 🎨 **Visual Workflow Editor**: Drag-and-drop interface for building workflows
- ⏰ **Scheduling**: Cron-based workflow scheduling with Celery
- 🔗 **Node Connections**: Proper data flow between workflow nodes
- 📊 **GRM Integration**: Built-in nodes for GRM database operations
- 📝 **File Operations**: Write logs and data to files
- 🔄 **Real-time Execution**: Live execution monitoring and logging
- 📈 **Dashboard**: Comprehensive workflow management dashboard

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up Database**:
   ```bash
   cd GRM
   python manage.py migrate
   python manage.py setup_complete_system
   ```

3. **Create Superuser**:
   ```bash
   python manage.py createsuperuser
   ```

4. **Start the System**:
   ```bash
   python ../start_workflow_system.py
   ```

   Or manually start each component:
   ```bash
   # Terminal 1: Start Redis
   redis-server
   
   # Terminal 2: Start Celery Worker
   cd GRM
   celery -A system worker -l info
   
   # Terminal 3: Start Celery Beat
   cd GRM
   celery -A system beat -l info
   
   # Terminal 4: Start Django
   cd GRM
   python manage.py runserver
   ```

5. **Access the System**:
   - Workflow Dashboard: http://127.0.0.1:8000/workflow/
   - Admin Interface: http://127.0.0.1:8000/admin/

## Available Node Types

### Triggers
- **Manual Trigger**: Start workflows manually
- **Schedule Trigger**: Cron-based scheduling
- **Webhook Trigger**: HTTP webhook endpoints

### Data Sources
- **Database Query**: Query any database table
- **HTTP Request**: Make API calls
- **GRM Data**: GRM-specific data operations
- **GRM Payment Check**: Check payment percentage (converted from PHP)

### Transform
- **Data Transform**: Map and transform data
- **JSON Parser**: Parse and manipulate JSON

### Conditions
- **Condition**: Branch based on data conditions
- **Switch**: Multi-way branching

### Actions
- **Send Email**: Email notifications
- **Write File**: Write data to files
- **Log Message**: Debug logging
- **Cron Log Writer**: Write cron execution logs

### Outputs
- **Save to Database**: Store data in database
- **Export to File**: Export data as JSON/CSV
- **HTTP Response**: Send webhook responses

## Workflow Creation

1. Go to the workflow dashboard
2. Click "Create Workflow"
3. Drag nodes from the palette to the canvas
4. Connect nodes by dragging from output handles to input handles
5. Configure each node by clicking on it
6. Save and test your workflow

## Data Flow

Data flows between nodes through connections. Use the data mapping features to:
- Map fields from previous nodes: `{{previous_node.field_name}}`
- Transform data structure
- Filter and aggregate data

## Scheduling

1. Edit a workflow
2. Go to the Settings tab
3. Enable scheduling
4. Set cron expression (e.g., `0 9 * * *` for daily at 9 AM)
5. Save the workflow

## GRM Integration

The system includes specific nodes for GRM operations:
- Get request data with filters
- Retrieve passenger information
- Check payment percentages
- Update PNR status

## File Operations

Use the File Write node to:
- Log execution data
- Export results
- Create cron job logs
- Store processed data

## API Endpoints

- `GET /workflow/api/workflows/` - List workflows
- `POST /workflow/api/workflows/` - Create workflow
- `POST /workflow/api/workflows/{id}/execute/` - Execute workflow
- `POST /workflow/api/workflows/{id}/schedule/` - Schedule workflow
- `GET /workflow/api/executions/` - List executions

## Troubleshooting

1. **Redis Connection Error**: Make sure Redis is running
2. **Celery Tasks Not Running**: Check Celery worker is started
3. **Scheduled Workflows Not Running**: Verify Celery beat is running
4. **Node Connections Not Working**: Clear browser cache and reload
5. **Database Errors**: Check database connection in settings

## Development

To add new node types:
1. Create handler in `apps/workflow_app/handlers/`
2. Add to `NODE_HANDLERS` registry
3. Run `python manage.py setup_node_types`

## Production Deployment

1. Set `DEBUG = False` in settings
2. Configure proper database settings
3. Set up Redis cluster
4. Use production WSGI server (gunicorn)
5. Configure Celery with supervisor
6. Set up proper logging