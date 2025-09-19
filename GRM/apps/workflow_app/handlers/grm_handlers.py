"""
GRM specific handlers for workflow operations
"""
import json
from typing import Dict, Any
from django.db import connection
from .base import BaseNodeHandler

class GRMPaymentCheckHandler(BaseNodeHandler):
    """Handler for GRM payment percentage check functionality"""
    
    def execute(self, config: Dict[str, Any], input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        pnr = config.get('pnr') or input_data.get('data', {}).get('pnr')
        transaction_master_id = config.get('transaction_master_id', 0)
        series_group_id = config.get('series_group_id', 1)
        pnr_blocking_id = config.get('pnr_blocking_id', '')
        
        if not pnr:
            raise ValueError("PNR is required for payment check")
        
        try:
            payment_in_percent = self._check_payment_type_in_percentage(
                pnr, transaction_master_id, series_group_id, pnr_blocking_id
            )
            
            return {
                'data': {
                    'pnr': pnr,
                    'payment_in_percent': payment_in_percent,
                    'transaction_master_id': transaction_master_id,
                    'series_group_id': series_group_id
                },
                'success': True,
                'message': f'Payment check completed for PNR {pnr}'
            }
            
        except Exception as e:
            self.log_execution(f"Payment check failed: {str(e)}", 'error')
            raise ValueError(f"Payment check failed: {str(e)}")
    
    def _check_payment_type_in_percentage(self, pnr, transaction_master_id=0, series_group_id=1, pnr_blocking_id=''):
        """
        Check payment type in percentage - converted from PHP function
        """
        payment_in_percent = 'Y'
        i_transaction_master_id = 0
        i_series_group_id = 0
        
        if transaction_master_id and series_group_id and transaction_master_id > 0 and series_group_id > 0:
            i_transaction_master_id = transaction_master_id
            i_series_group_id = series_group_id
        else:
            # Getting all requestApprovedFlightId's associated with this PNR
            pnr_blocking_sql = """
                SELECT request_approved_flight_id
                FROM pnr_blocking_details
                WHERE pnr = %s
            """
            
            with connection.cursor() as cursor:
                cursor.execute(pnr_blocking_sql, [pnr])
                pnr_results = cursor.fetchall()
                
                if pnr_results:
                    request_approved_flight_id = pnr_results[0][0]
                    
                    # Get transaction and series details
                    flight_details_sql = """
                        SELECT rafd.transaction_master_id, rafd.series_request_id, srd.series_group_id
                        FROM request_approved_flight_details as rafd,
                             series_request_details as srd
                        WHERE rafd.request_approved_flight_id = %s 
                        AND rafd.series_request_id = srd.series_request_id
                        ORDER BY transaction_master_id DESC
                    """
                    
                    cursor.execute(flight_details_sql, [request_approved_flight_id])
                    flight_results = cursor.fetchall()
                    
                    if flight_results:
                        i_transaction_master_id = flight_results[0][0]
                        i_series_group_id = flight_results[0][2]
        
        if i_transaction_master_id and i_series_group_id and i_transaction_master_id > 0 and i_series_group_id > 0:
            condition = ""
            if pnr_blocking_id:
                condition = f"AND pnr_blocking_id = {pnr_blocking_id}"
            elif i_series_group_id:
                condition = f"AND series_group_id = {i_series_group_id}"
            
            # Get percentage or absolute amount from request timeline details
            timeline_sql = f"""
                SELECT percentage_value, absolute_amount
                FROM request_timeline_details
                WHERE transaction_id = %s 
                AND timeline_type = 'PAYMENT' 
                AND status != 'TIMELINEEXTEND'
                {condition}
                ORDER BY transaction_id ASC
            """
            
            with connection.cursor() as cursor:
                cursor.execute(timeline_sql, [i_transaction_master_id])
                timeline_results = cursor.fetchall()
                
                if timeline_results:
                    percentage_value = timeline_results[0][0]
                    absolute_amount = timeline_results[0][1]
                    
                    # If percentage values > 0 and amount is 0, then payment percent is yes
                    if percentage_value > 0 and absolute_amount == 0:
                        payment_in_percent = 'Y'
                    # If absolute amount > 0, then payment percent is No
                    elif absolute_amount != 0:
                        payment_in_percent = 'N'
        
        return payment_in_percent

class GRMRequestDataHandler(BaseNodeHandler):
    """Handler for GRM request data operations"""
    
    def execute(self, config: Dict[str, Any], input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        operation = config.get('operation', 'get_requests')
        
        if operation == 'get_requests':
            return self._get_request_data(config, input_data)
        elif operation == 'get_passengers':
            return self._get_passenger_data(config, input_data)
        elif operation == 'get_transactions':
            return self._get_transaction_data(config, input_data)
        elif operation == 'update_pnr_status':
            return self._update_pnr_status(config, input_data)
        elif operation == 'check_payment_percentage':
            return self._check_payment_percentage(config, input_data)
        else:
            raise ValueError(f"Unsupported GRM operation: {operation}")
    
    def _get_request_data(self, config: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get request master data with filters"""
        filters = config.get('filters', {})
        limit = config.get('limit', 100)
        
        # Parse filters if string
        if isinstance(filters, str):
            try:
                filters = json.loads(filters) if filters else {}
            except json.JSONDecodeError:
                filters = {}
        
        query = """
            SELECT rm.request_master_id, rm.request_type, rm.trip_type, rm.requested_date,
                   rm.number_of_passenger, rm.request_fare, rm.view_status,
                   ud.first_name, ud.last_name, ud.email_id
            FROM request_master rm
            LEFT JOIN user_details ud ON rm.r_user_id = ud.user_id
            WHERE 1=1
        """
        
        params = []
        
        # Apply filters from input data
        input_filters = input_data.get('data', {})
        if 'user_id' in input_filters:
            query += " AND rm.r_user_id = %s"
            params.append(input_filters['user_id'])
        
        if 'status' in filters:
            query += " AND rm.view_status = %s"
            params.append(filters['status'])
        
        if 'date_from' in filters:
            query += " AND rm.requested_date >= %s"
            params.append(filters['date_from'])
        
        query += f" ORDER BY rm.requested_date DESC LIMIT {limit}"
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                return {
                    'data': results,
                    'count': len(results),
                    'success': True,
                    'message': f"Retrieved {len(results)} requests"
                }
        except Exception as e:
            raise ValueError(f"Failed to get request data: {str(e)}")
    
    def _get_passenger_data(self, config: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get passenger details for a request"""
        request_master_id = input_data.get('data', {}).get('request_master_id')
        
        if not request_master_id:
            raise ValueError("request_master_id is required")
        
        query = """
            SELECT pd.passenger_id, pd.first_name, pd.last_name, pd.age,
                   pd.pax_email_id, pd.pax_mobile_number, pd.passenger_type,
                   pd.pnr, arm.airlines_request_id
            FROM passenger_details pd
            LEFT JOIN airlines_request_mapping arm ON pd.airlines_request_id = arm.airlines_request_id
            WHERE arm.r_request_master_id = %s
            ORDER BY pd.passenger_id
        """
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, [request_master_id])
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                return {
                    'data': results,
                    'count': len(results),
                    'success': True,
                    'message': f"Retrieved {len(results)} passengers"
                }
        except Exception as e:
            raise ValueError(f"Failed to get passenger data: {str(e)}")
    
    def _check_payment_percentage(self, config: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check payment percentage using the converted PHP function"""
        pnr = input_data.get('data', {}).get('pnr')
        transaction_master_id = input_data.get('data', {}).get('transaction_master_id', 0)
        series_group_id = input_data.get('data', {}).get('series_group_id', 1)
        pnr_blocking_id = input_data.get('data', {}).get('pnr_blocking_id', '')
        
        if not pnr:
            raise ValueError("PNR is required")
        
        # Use the payment check handler
        payment_handler = GRMPaymentCheckHandler()
        return payment_handler.execute({
            'pnr': pnr,
            'transaction_master_id': transaction_master_id,
            'series_group_id': series_group_id,
            'pnr_blocking_id': pnr_blocking_id
        }, input_data, context)

class CronJobFileWriteHandler(BaseNodeHandler):
    """Handler for writing cron job execution logs"""
    
    def execute(self, config: Dict[str, Any], input_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        log_file_path = config.get('log_file_path', '/tmp/cron_execution.log')
        workflow_name = context.get('workflow_name', 'Unknown Workflow')
        execution_id = context.get('execution_id', 'Unknown')
        
        # Get execution data
        execution_data = input_data.get('data', {})
        
        # Create log entry
        from django.utils import timezone
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        
        log_entry = f"""
[{timestamp}] Cron Job Execution
Workflow: {workflow_name}
Execution ID: {execution_id}
Status: {execution_data.get('status', 'completed')}
Data: {json.dumps(execution_data, indent=2)}
---
"""
        
        try:
            import os
            
            # Ensure directory exists
            directory = os.path.dirname(log_file_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory)
            
            # Write log entry
            with open(log_file_path, 'a', encoding='utf-8') as f:
                f.write(log_entry)
            
            file_size = os.path.getsize(log_file_path)
            
            return {
                'data': {
                    'log_file_path': log_file_path,
                    'file_size': file_size,
                    'timestamp': timestamp,
                    'workflow_name': workflow_name
                },
                'success': True,
                'message': f'Cron job log written to {log_file_path}'
            }
            
        except Exception as e:
            self.log_execution(f"Cron log write failed: {str(e)}", 'error')
            raise ValueError(f"Failed to write cron log: {str(e)}")