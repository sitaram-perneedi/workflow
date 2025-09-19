from django.db import models


# Create your models here.
class UserDetails(models.Model):
    user_id = models.AutoField(primary_key=True)
    group_id = models.IntegerField(blank=True, null=True)
    corporate_id = models.IntegerField(blank=True, null=True)
    title = models.CharField(max_length=16, blank=True, null=True)
    first_name = models.CharField(max_length=32, blank=True, null=True)
    last_name = models.CharField(max_length=32, blank=True, null=True)
    email_id = models.CharField(max_length=100, blank=True, null=True)
    user_password = models.CharField(max_length=90, blank=True, null=True)
    user_address = models.CharField(max_length=256, blank=True, null=True)
    phone_number = models.CharField(max_length=32, blank=True, null=True)
    approved_status = models.CharField(max_length=1)
    email_verification_status = models.CharField(max_length=1)
    confirm_code = models.CharField(max_length=100, blank=True, null=True)
    created_date = models.DateTimeField()
    time_zone_interval = models.CharField(max_length=40, blank=True, null=True)
    time_zone_key = models.CharField(max_length=352, blank=True, null=True)
    ip_address = models.CharField(max_length=40)
    country_code = models.CharField(max_length=16, blank=True, null=True)
    last_login_ip_address = models.CharField(max_length=40)
    last_login_date = models.DateTimeField()
    country_number = models.CharField(max_length=15, blank=True, null=True)
    city_id = models.IntegerField(blank=True, null=True)
    user_zip_code = models.CharField(max_length=36, blank=True, null=True)
    user_name = models.CharField(max_length=36, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'user_details'


# we have to mentioned db_column name in the foreign key constraint because if we didn't provide django will consider
# the field as primary key, and it will append "_id" to the current field name
class RequestMaster(models.Model):
    request_master_id = models.AutoField(primary_key=True)
    r_user_id = models.ForeignKey(UserDetails, models.DO_NOTHING, db_column='user_id', db_constraint=False)
    request_type = models.CharField(max_length=20, blank=True, null=True)
    request_type_id = models.IntegerField()
    trip_type = models.CharField(max_length=1, blank=True, null=True)
    series_type = models.CharField(max_length=1, blank=True, null=True)
    user_currency = models.CharField(max_length=3)
    request_fare = models.FloatField()
    exchange_rate = models.FloatField()
    requested_date = models.DateTimeField(blank=True, null=True)
    number_of_passenger = models.IntegerField(blank=True, null=True)
    number_of_adult = models.IntegerField(blank=True, null=True)
    number_of_child = models.IntegerField(blank=True, null=True)
    number_of_infant = models.IntegerField(blank=True, null=True)
    remarks = models.TextField(db_collation='utf8_general_ci', blank=True, null=True)
    fare_acceptance_transaction_id = models.IntegerField(blank=True, null=True)
    request_source = models.CharField(max_length=100, blank=True, null=True)
    requested_corporate = models.CharField(max_length=100, blank=True, null=True)
    opened_by = models.IntegerField()
    opened_time = models.DateTimeField()
    view_status = models.CharField(max_length=10)
    request_raised_by = models.IntegerField(blank=True, null=True)
    priority = models.IntegerField(blank=True, null=True)
    auto_pilot_policy_id = models.IntegerField(blank=True, null=True)
    auto_pilot_status = models.CharField(max_length=10, blank=True, null=True)
    reference_request_master_id = models.IntegerField()
    quote_type = models.CharField(max_length=2, blank=True, null=True)
    request_group_name = models.CharField(max_length=100)
    group_category_id = models.IntegerField(blank=True, null=True)
    flexible_on_dates = models.CharField(max_length=1, blank=True, null=True)
    pnr_ignore_status = models.CharField(max_length=1, blank=True, null=True)
    queue_no = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'request_master'


class RequestDetails(models.Model):
    request_id = models.AutoField(primary_key=True)
    r_request_master_id = models.ForeignKey(RequestMaster, models.DO_NOTHING, db_column='request_master_id',
                                            db_constraint=False)
    origin_airport_code = models.CharField(max_length=5, blank=True, null=True)
    dest_airport_code = models.CharField(max_length=5, blank=True, null=True)
    flight_number = models.CharField(max_length=200, blank=True, null=True)
    cabin = models.CharField(max_length=20, blank=True, null=True)
    from_date = models.DateField(blank=True, null=True)
    to_date = models.DateField(blank=True, null=True)
    start_time = models.CharField(max_length=5, blank=True, null=True)
    end_time = models.CharField(max_length=5, blank=True, null=True)
    series_weekdays = models.CharField(max_length=50, blank=True, null=True)
    baggage_allowance = models.CharField(max_length=250, blank=True, null=True)
    ancillary = models.CharField(max_length=5, blank=True, null=True)
    meals_code = models.CharField(max_length=5, blank=True, null=True)
    pnr = models.CharField(max_length=25, blank=True, null=True)
    trip_name = models.IntegerField()
    trip_type = models.CharField(max_length=1)

    class Meta:
        managed = False
        db_table = 'request_details'


class RequestTimelineDetails(models.Model):
    request_timeline_id = models.AutoField(primary_key=True)
    transaction_id = models.IntegerField()
    pnr_blocking_id = models.IntegerField()
    series_group_id = models.IntegerField()
    policy_history_id = models.IntegerField(blank=True, null=True)
    time_line_id = models.IntegerField()
    timeline_type = models.CharField(max_length=10)
    validity = models.IntegerField()
    validity_type = models.IntegerField()
    expiry_type = models.IntegerField()
    expiry_date = models.DateTimeField()
    percentage_value = models.FloatField()
    absolute_amount = models.FloatField()
    status = models.CharField(max_length=30, blank=True, null=True)
    materialization = models.IntegerField(blank=True, null=True)
    policy = models.CharField(max_length=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'request_timeline_details'


class SeriesRequestDetails(models.Model):
    series_request_id = models.AutoField(primary_key=True)
    r_request_id = models.ForeignKey(RequestDetails, models.DO_NOTHING, db_column='request_id', db_constraint=False)
    departure_date = models.DateField(blank=True, null=True)
    number_of_passenger = models.IntegerField(blank=True, null=True)
    number_of_adult = models.IntegerField(blank=True, null=True)
    number_of_child = models.IntegerField(blank=True, null=True)
    number_of_infant = models.IntegerField(blank=True, null=True)
    cabin = models.CharField(max_length=20, blank=True, null=True)
    start_time = models.CharField(max_length=5, blank=True, null=True)
    end_time = models.CharField(max_length=5, blank=True, null=True)
    baggage_allowance = models.CharField(max_length=250, blank=True, null=True)
    ancillary = models.CharField(max_length=5, blank=True, null=True)
    meals_code = models.CharField(max_length=5, blank=True, null=True)
    pnr = models.CharField(max_length=25, blank=True, null=True)
    expected_fare = models.FloatField(blank=True, null=True)
    flexible_on_dates = models.CharField(max_length=1)
    group_category_id = models.IntegerField(blank=True, null=True)
    mapped_series_request_id = models.IntegerField(blank=True, null=True)
    series_group_id = models.IntegerField(blank=True, null=True)
    flight_number = models.CharField(max_length=200, blank=True, null=True)
    current_load_factor = models.CharField(max_length=100, blank=True, null=True)
    forecast_load_factor = models.CharField(max_length=100, blank=True, null=True)
    future_load_factor = models.CharField(max_length=100, blank=True, null=True)
    parent_series_request_id = models.IntegerField()
    flight_status = models.CharField(max_length=2)
    foc_pax = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'series_request_details'


class TransactionMaster(models.Model):
    transaction_id = models.AutoField(primary_key=True)
    airlines_request_id = models.IntegerField(blank=True, null=True)
    request_master_history_id = models.IntegerField(blank=True, null=True)
    fare_advised = models.FloatField()
    child_fare = models.FloatField()
    infant_fare = models.FloatField()
    exchange_rate = models.FloatField()
    fare_negotiable = models.CharField(max_length=20, blank=True, null=True)
    auto_approval = models.CharField(max_length=1)
    transaction_fee = models.CharField(max_length=1, blank=True, null=True)
    fare_validity = models.IntegerField(blank=True, null=True)
    fare_validity_type_id = models.IntegerField(blank=True, null=True)
    fare_expiry_type = models.IntegerField()
    payment_validity = models.IntegerField()
    payment_validity_type = models.IntegerField()
    payment_expiry_type = models.IntegerField()
    passenger_validity = models.IntegerField()
    passenger_validity_type = models.IntegerField()
    passenger_expiry_type = models.IntegerField()
    transaction_date = models.DateTimeField(blank=True, null=True)
    fare_expiry_date = models.DateTimeField()
    payment_expiry_date = models.DateTimeField()
    passenger_expiry_date = models.DateTimeField()
    active_status = models.IntegerField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    alternate_flight_remarks = models.TextField(blank=True, null=True)
    timelimit_remarks = models.TextField(blank=True, null=True)
    response_source = models.CharField(max_length=50, blank=True, null=True)
    cancel_policy_id = models.IntegerField()
    time_line_id = models.IntegerField()
    negotiation_policy_id = models.IntegerField()
    sales_promo_status = models.CharField(max_length=1)
    payment_in_percent = models.CharField(max_length=3)

    class Meta:
        managed = False
        db_table = 'transaction_master'


class RequestApprovedFlightDetails(models.Model):
    request_approved_flight_id = models.AutoField(primary_key=True)
    airlines_request_id = models.IntegerField(blank=True, null=True)
    r_transaction_master_id = models.ForeignKey(TransactionMaster, models.DO_NOTHING, db_column='transaction_master_id',
                                                db_constraint=False)
    r_rafd_request_id = models.ForeignKey(RequestDetails, models.DO_NOTHING, db_column='request_id',
                                          db_constraint=False)
    request_details_history_id = models.IntegerField(blank=True, null=True)
    r_series_request_id = models.ForeignKey(SeriesRequestDetails, models.DO_NOTHING, db_column='series_request_id',
                                            db_constraint=False)
    series_request_history_id = models.IntegerField(blank=True, null=True)
    request_option_id = models.IntegerField(blank=True, null=True)
    airline_code = models.CharField(max_length=5, blank=True, null=True)
    flight_code = models.CharField(max_length=10, blank=True, null=True)
    flight_number = models.CharField(max_length=20, blank=True, null=True)
    source = models.CharField(max_length=5, blank=True, null=True)
    destination = models.CharField(max_length=5, blank=True, null=True)
    departure_date = models.DateField()
    arrival_date = models.DateField()
    dep_time = models.CharField(max_length=6)
    arr_time = models.CharField(max_length=6)
    journey_time = models.CharField(max_length=6)
    fare_filter_method = models.CharField(max_length=30, blank=True, null=True)
    no_of_adult = models.IntegerField(blank=True, null=True)
    no_of_child = models.IntegerField(blank=True, null=True)
    no_of_infant = models.IntegerField(blank=True, null=True)
    displacement_cost = models.FloatField()
    base_fare = models.FloatField()
    tax = models.FloatField()
    fare_passenger = models.FloatField()
    tax_breakup = models.CharField(max_length=150)
    child_base_fare = models.FloatField()
    child_tax = models.FloatField()
    child_tax_breakup = models.CharField(max_length=150)
    infant_base_fare = models.FloatField()
    infant_tax = models.FloatField()
    infant_tax_breakup = models.CharField(max_length=150)
    baggauge_fare = models.FloatField(blank=True, null=True)
    meals_fare = models.FloatField(blank=True, null=True)
    baggage_code = models.CharField(max_length=5)
    stops = models.IntegerField(blank=True, null=True)
    capacity = models.IntegerField()
    sold = models.IntegerField()
    seat_availability = models.IntegerField()
    discount_fare = models.FloatField(blank=True, null=True)
    child_discount_fare = models.FloatField(blank=True, null=True)
    sales_promo_discount_fare = models.FloatField()
    adjusted_amount = models.FloatField(blank=True, null=True)
    accepted_flight_status = models.CharField(max_length=1)
    displacement_fare_remarks = models.TextField(blank=True, null=True)
    surcharge = models.FloatField(blank=True, null=True)
    ancillary_fare = models.TextField(blank=True, null=True)
    free_cost_count = models.IntegerField()
    foc_base_fare = models.FloatField()
    foc_tax = models.FloatField()
    foc_tax_breakup = models.CharField(max_length=150, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'request_approved_flight_details'


class PnrBlockingDetails(models.Model):
    pnr_blocking_id = models.AutoField(primary_key=True)
    request_master_id = models.IntegerField()
    r_request_approved_flight_id = models.ForeignKey(RequestApprovedFlightDetails, models.DO_NOTHING,
                                                     db_column='request_approved_flight_id', db_constraint=False)
    via_flight_id = models.IntegerField()
    pnr = models.CharField(max_length=10)
    no_of_adult = models.IntegerField()
    no_of_child = models.IntegerField()
    no_of_infant = models.IntegerField()
    no_of_foc = models.IntegerField()
    pnr_amount = models.FloatField()
    status = models.CharField(max_length=30, blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'pnr_blocking_details'


class StatusDetails(models.Model):
    status_id = models.AutoField(primary_key=True)
    status_code = models.CharField(max_length=5, blank=True, null=True)
    status_name = models.CharField(max_length=150, blank=True, null=True)
    front_end = models.CharField(max_length=1, blank=True, null=True)
    back_end = models.CharField(max_length=1, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'status_details'


class AirlinesRequestMapping(models.Model):
    airlines_request_id = models.AutoField(primary_key=True)
    r_request_master_id = models.ForeignKey(RequestMaster, models.DO_NOTHING, db_column='request_master_id',
                                            db_constraint=False)
    corporate_id = models.IntegerField(blank=True, null=True)
    current_status = models.ForeignKey(StatusDetails, models.DO_NOTHING, db_column='current_status',
                                       db_constraint=False)
    last_updated = models.DateTimeField(blank=True, null=True)
    request_upload_batch_id = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'airlines_request_mapping'


class PassengerDetails(models.Model):
    passenger_id = models.AutoField(primary_key=True)
    airlines_request_id = models.IntegerField(blank=True, null=True)
    request_approved_flight_id = models.IntegerField(blank=True, null=True)
    series_request_id = models.IntegerField(blank=True, null=True)
    name_number = models.CharField(max_length=10, blank=True, null=True)
    pnr = models.CharField(max_length=20, blank=True, null=True)
    title = models.CharField(max_length=16, blank=True, null=True)
    first_name = models.CharField(max_length=35, blank=True, null=True)
    last_name = models.CharField(max_length=35, blank=True, null=True)
    middle_name = models.CharField(max_length=35, blank=True, null=True)
    age = models.CharField(max_length=16, blank=True, null=True)
    pax_email_id = models.CharField(max_length=32, blank=True, null=True)
    pax_mobile_number = models.CharField(max_length=16, blank=True, null=True)
    pax_employee_code = models.CharField(max_length=16, blank=True, null=True)
    pax_employee_id = models.CharField(max_length=16, blank=True, null=True)
    passenger_type = models.CharField(max_length=10, blank=True, null=True)
    id_proof = models.CharField(max_length=16, blank=True, null=True)
    id_proof_number = models.CharField(max_length=16, blank=True, null=True)
    sex = models.CharField(max_length=16, blank=True, null=True)
    dob = models.CharField(max_length=16, blank=True, null=True)
    citizenship = models.CharField(max_length=16, blank=True, null=True)
    passport_no = models.CharField(max_length=16, blank=True, null=True)
    date_of_issue = models.CharField(max_length=256, blank=True, null=True)
    date_of_expiry = models.CharField(max_length=256, blank=True, null=True)
    submitted_date = models.DateTimeField(blank=True, null=True)
    traveller_number = models.CharField(max_length=16, blank=True, null=True)
    frequent_flyer_number = models.CharField(max_length=16, blank=True, null=True)
    passport_issued_place = models.CharField(max_length=80, blank=True, null=True)
    meal_code = models.CharField(max_length=6, blank=True, null=True)
    place_of_birth = models.CharField(max_length=40, blank=True, null=True)
    address = models.CharField(max_length=200, blank=True, null=True)
    additional_details = models.TextField()
    passenger_status = models.CharField(max_length=2)
    foc_status = models.CharField(max_length=1)

    class Meta:
        managed = False
        db_table = 'passenger_details'


class PackageDetails(models.Model):
    package_id = models.AutoField(primary_key=True)
    pnr_blocking_id = models.ForeignKey(PnrBlockingDetails, models.DO_NOTHING, db_column='pnr_blocking_id',
                                        db_constraint=False)
    adult = models.IntegerField()
    child = models.IntegerField()
    infant = models.IntegerField()
    status = models.CharField(max_length=1)
    created_at = models.DateTimeField()
    created_by = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'package_details'


class CabinDetails(models.Model):
    cabin_id = models.AutoField(primary_key=True)
    cabin_name = models.CharField(max_length=250, blank=True, null=True)
    cabin_status = models.CharField(max_length=1, blank=True, null=True)
    cabin_value = models.CharField(max_length=25, blank=True, null=True)
    pnr_blocking_class = models.CharField(max_length=5, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'cabin_details'


class AirportDetails(models.Model):
    airport_id = models.AutoField(primary_key=True)
    airport_code = models.CharField(unique=True, max_length=3)
    airport_name = models.CharField(max_length=100, blank=True, null=True)
    country_code = models.CharField(max_length=2)
    display_status = models.CharField(max_length=1)
    user_id = models.IntegerField(blank=True, null=True)
    created_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'airport_details'
