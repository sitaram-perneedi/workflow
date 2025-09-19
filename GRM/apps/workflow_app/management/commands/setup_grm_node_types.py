"""
Management command to set up GRM-specific node types
"""
from django.core.management.base import BaseCommand
from apps.workflow_app.models import NodeType

class Command(BaseCommand):
    help = 'Set up GRM-specific node types for the workflow system'
    
    def handle(self, *args, **options):
        grm_node_types = [
            {
                'name': 'grm_payment_check',
                'display_name': 'GRM Payment Check',
                'category': 'data',
                'description': 'Check payment type percentage for GRM PNR',
                'icon': 'fa-credit-card',
                'color': '#8b5cf6',
                'config_schema': {
                    'fields': [
                        {
                            'name': 'pnr',
                            'type': 'text',
                            'placeholder': 'PNR or {{input.pnr}}',
                            'label': 'PNR',
                            'required': True
                        },
                        {
                            'name': 'transaction_master_id',
                            'type': 'number',
                            'default': 0,
                            'label': 'Transaction Master ID'
                        },
                        {
                            'name': 'series_group_id',
                            'type': 'number',
                            'default': 1,
                            'label': 'Series Group ID'
                        },
                        {
                            'name': 'pnr_blocking_id',
                            'type': 'text',
                            'label': 'PNR Blocking ID'
                        }
                    ]
                },
                'handler_class': 'apps.workflow_app.handlers.grm_handlers.GRMPaymentCheckHandler'
            },
            {
                'name': 'grm_request_data',
                'display_name': 'GRM Request Data',
                'category': 'data',
                'description': 'Get GRM request, passenger, and transaction data',
                'icon': 'fa-plane',
                'color': '#0ea5e9',
                'config_schema': {
                    'fields': [
                        {
                            'name': 'operation',
                            'type': 'select',
                            'options': ['get_requests', 'get_passengers', 'get_transactions', 'update_pnr_status', 'check_payment_percentage'],
                            'default': 'get_requests',
                            'label': 'Operation'
                        },
                        {
                            'name': 'filters',
                            'type': 'textarea',
                            'placeholder': '{"status": "active", "user_id": "{{input.user_id}}"}',
                            'label': 'Filters (JSON)'
                        },
                        {
                            'name': 'limit',
                            'type': 'number',
                            'default': 100,
                            'label': 'Limit'
                        }
                    ]
                },
                'handler_class': 'apps.workflow_app.handlers.grm_handlers.GRMRequestDataHandler'
            },
            {
                'name': 'cron_file_write',
                'display_name': 'Cron Log Writer',
                'category': 'action',
                'description': 'Write cron job execution logs to file',
                'icon': 'fa-file-alt',
                'color': '#6b7280',
                'config_schema': {
                    'fields': [
                        {
                            'name': 'log_file_path',
                            'type': 'text',
                            'default': '/tmp/cron_execution.log',
                            'label': 'Log File Path',
                            'required': True
                        },
                        {
                            'name': 'include_data',
                            'type': 'checkbox',
                            'default': True,
                            'label': 'Include Execution Data'
                        }
                    ]
                },
                'handler_class': 'apps.workflow_app.handlers.grm_handlers.CronJobFileWriteHandler'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for node_type_data in grm_node_types:
            node_type, created = NodeType.objects.get_or_create(
                name=node_type_data['name'],
                defaults=node_type_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created GRM node type: {node_type.display_name}')
                )
            else:
                # Update existing node type
                for key, value in node_type_data.items():
                    setattr(node_type, key, value)
                node_type.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated GRM node type: {node_type.display_name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully set up GRM node types: {created_count} created, {updated_count} updated'
            )
        )