function _checkPaymentTypeInPercentage($pnr,$_transactionMasterId=0,$_seriesGroupId=1,$_pnrBlockingId='')
    {
		global $CFG;
		$paymentInPercent = 'Y';
		$_ItransactionMasterId= 0;     		
		$_IseriesGroupId= 0;
		if($_transactionMasterId!='' && $_seriesGroupId!='' && $_transactionMasterId>0 && $_seriesGroupId>0)
		{
			$_ItransactionMasterId= $_transactionMasterId;     		
			$_IseriesGroupId= $_seriesGroupId;
		}
		else
		{
			#Getting all requestApprovedFlightId's associated with this PNR
			$_ArequestApprovedflightIds = array();
			$requestApprovedFlightDetails =  array();
			$requestTimeLineDetails =  array();

			$pnrBlockingDetailsSql="SELECT
											request_approved_flight_id
									FROM
											".$CFG['db']['tbl']['pnr_blocking_details']."
									WHERE
											pnr = '".$pnr."'";	
			
			if(DB::isError($result=$this->_Oconnection->query($pnrBlockingDetailsSql)))
			{
					fileWrite($pnrBlockingDetailsSql,"SqlError","a+");
					return false;
			}
			if($result->numRows() > 0)
			{    
					while($row=$result->fetchRow(DB_FETCHMODE_ASSOC))
					{
							$_ArequestApprovedflightIds[]=$row['request_approved_flight_id'];
					}
					//Taking the series group id using the transaction id and series request id 
					$requestApprovedFlightDetailsSQL = "SELECT 
															rafd.transaction_master_id,
															rafd.series_request_id,
															srd.series_group_id
													FROM 
														   ".$CFG['db']['tbl']['request_approved_flight_details']." as rafd,
														   ".$CFG['db']['tbl']['series_request_details']." as srd  
													WHERE 
															rafd.request_approved_flight_id = ".$_ArequestApprovedflightIds[0]." AND
															rafd.series_request_id = srd.series_request_id 
													ORDER BY 
															transaction_master_id DESC ";
					
					if(DB::isError($requestApprovedResult = $this->_Oconnection->query($requestApprovedFlightDetailsSQL)))
					{
							fileWrite($requestApprovedFlightDetailsSQL,"SqlError","a+");
							return false;
					}
					if($requestApprovedResult->numRows() > 0)
					{
							while($requestApprovedResultRow=$requestApprovedResult->fetchRow(DB_FETCHMODE_ASSOC))
							{
								$requestApprovedFlightDetails[] = $requestApprovedResultRow;
							}
							$_ItransactionMasterId= $requestApprovedFlightDetails[0]['transaction_master_id'];     		
							$_IseriesGroupId= $requestApprovedFlightDetails[0]['series_group_id'];
					} 
			}
        }
		if($_ItransactionMasterId!='' && $_IseriesGroupId!='' && $_ItransactionMasterId>0 && $_IseriesGroupId>0)
		{
			if ($_pnrBlockingId!= '')
				$_Scondition = "AND pnr_blocking_id = ".$_pnrBlockingId."";
			else if ($_IseriesGroupId!='')
				$_Scondition = "AND series_group_id = ".$_IseriesGroupId."";

			//Taking the percentage or absoulte amount from request time line details
			$requestTimelineDetails = "SELECT 
												percentage_value,
												absolute_amount
										FROM 
												".$CFG['db']['tbl']['request_timeline_details']." 
										WHERE       
												transaction_id = ".$_ItransactionMasterId." AND
												timeline_type = 'PAYMENT' AND
												status!='TIMELINEEXTEND'
												".$_Scondition."
										ORDER BY            
												transaction_id ASC ";
			if(DB::isError($requestTimeLineResult = $this->_Oconnection->query($requestTimelineDetails)))
			{
					fileWrite($requestTimelineDetails,"SqlError","a+");
					return false;
			}
			if($requestTimeLineResult -> numRows() >0)
			{
					while($requestTimeLineRow=$requestTimeLineResult->fetchRow(DB_FETCHMODE_ASSOC))
					{
						$requestTimeLineDetails[] = $requestTimeLineRow;
					}   
					//if the percentage values and  amount is  zero than payment percent is yes
					if($requestTimeLineDetails[0]['percentage_value']>0 && $requestTimeLineDetails[0]['absolute_amount'] == 0)
					{
						$paymentInPercent = 'Y';
					}
					//if the absolute amount is greater than zero than payment percent is No
					else if($requestTimeLineDetails[0]['absolute_amount'] != 0)
					{
						$paymentInPercent = 'N';
					}    
			}
		}
		return $paymentInPercent;

	}
