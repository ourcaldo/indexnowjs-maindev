Authorization
To ensure secure client server communication, every API call should be authorized. Out of the various Authorization methods available, Midtrans uses BASIC AUTH. The format for BASIC AUTH is Username:Password. Using BASIC AUTH, API key can be passed as either Username or Password. For Midtrans, API key is passed as the Username, paired with an empty value for Password. It is then encoded into Base64 format and used as the authorization header.


Authorization Header

The Midtrans authorization header follows HTTP(S) BASIC AUTH convention. It utilizes Merchant Server Key as Username and blank value for Password.


Authorization Header Example

To get the authorization header, follow the steps given below.

Get the Server Key.
The Server Key is unique for Sandbox environment and Production environment. To obtain the respective Server Key follow the links given below.

Server Key for Sandbox environment
Server Key for Production environment
Replace Username and Password.
The BASIC AUTH format is Username:Password. Replace Username with Server Key and leave Password blank.
So, this results in a string {Your_Server_Key}:.

Encode the resulting string to Base64 format.

Include this Base64 encoded string in the HTTP(S) header. Prepend the authorization method (Basic) and a space ( ) to the encoded string. The authorization header is as given below:

Authorization: Basic [Base64({Your_Server_Key}:)]


For an example key, refer to the table given below.

Server Key	SB-Mid-server-abc123cde456
BASIC AUTH format	SB-Mid-server-abc123cde456:
Base64	U0ItTWlkLXNlcnZlci1hYmMxMjNjZGU0NTY6
Authorization	Basic U0ItTWlkLXNlcnZlci1hYmMxMjNjZGU0NTY6

📘
Note

Remember to include : to the Server Key before passing it to the Base64 encoder

The Authorization Header given in the example is for reference only. Please use your own Sandbox/Production Server Key to create your API key.

The API keys for Sandbox and Production are different. When going live, generate new API Keys to access the live endpoints.

API Methods
Subscription API (also called as Recurring) is intended for recurring transactions - transactions that deduct customer's funds at a pre-defined time interval. Supported payment method currently are Card Payment and GoPay (for GoPay Tokenizations). Subscriptions are supported in both Snap Checkout and Core API integration.

You can perform recurring transaction by creating subscription details.
Midtrans will attempt to auto-deduct customer funds at the set time interval based on the subscription details (subscription schedule, amount, currency, and so on) created.


API Methods
HTTP Method	Endpoint	Definition
POST	/v1/subscriptions	Create a subscription that contains all the details for creating transaction.
GET	/v1/subscriptions/subscription_id	Retrieve the subscription details with a given subscription_id.
POST	/v1/subscriptions/subscription_id/disable	Disable the customer's subscription. The customer will not be charged in the future for this subscription.
POST	/v1/subscriptions/subscription_id/enable	Enable the customer's subscription.
PATCH	/v1/subscriptions/subscription_id	Update existing subscription details.

Create Subscription
post
https://api.sandbox.midtrans.com/v1/subscriptions
Recent Requests
time	status	user agent	
1m ago	
400
2m ago	
401
2 Requests This Month

Create a subscription or recurring transaction by sending all the details required to create a transaction. The details such as name, amount, currency, payment_type, token, and schedule are sent in the request. Successful request returns id status:active, and other subscription details.

Subscription API currently supports idempotency when creating subscription. If you're using the same idempotency key, you will continue to receive the same response. Subscription will validate the request body first before performing the idempotency check - this idempotency applies for the next 3 minutes for the same key.



Create Subscription Method
HTTP Method	Endpoint	Description
POST	BASE_URL/v1/subscriptions	Create subscription


Create Subscription Request
Sample Request - Credit Card
Sample Request - Gopay Tokenization

{
    "name": "MONTHLY_2019",
    "amount": "14000",
    "currency": "IDR",
    "payment_type": "credit_card",
    "token": "48111111sHfSakAvHvFQFEjTivUV1114",
    "schedule": {
      "interval": 1,
      "interval_unit": "month",
      "max_interval": 12,
      "start_time": "2020-07-22 07:25:01 +0700"
    },
    "retry_schedule": {
      "interval": 1,
      "interval_unit": "day",
      "max_interval": 3,
    },
    "metadata": {
      "description": "Recurring payment for A"
    },
    "customer_details": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "johndoe@email.com",
      "phone": "+62812345678"
    }
}
JSON Attribute	Description	Type	Required
name	Name of the subscription. It is used to generate order ID for the transaction. Generated order ID will contain subscription name and 32 digits of unique number.
Note: Allowed symbols are dash(-), underscore(_), tilde (~), and dot (.).	String(40)	Required
amount	The amount to be charged to the customer.
Note: Do not use decimal.	String	Required
currency	ISO-4217 representation of three-letter alphabetic currency code. Value: IDR.
Note: Currently only IDR is supported.	String	Required
payment_type	The payment method used by the customer. Note: Currently only credit_card and gopay are supported.	String	Required
token (Card Payment)	The saved_token_id for Card Payment. Credit Card token retrieved via One Click Token Response	String	Required
token (GoPay)	The token for Gopay Tokenization. GoPay token retrieved via Get Pay Account API	String	Required
schedule	Details of the subscription schedule.	Object	Required
retry_schedule	Details of the retry scheudle	Object	Optional
metadata	Metadata of subscription specified by you.
Note: Limit the size to less than 1KB.	Object	Optional
customer_details	Details of the customer.	Object	Optional
gopay	GoPay subscription information, required if payment type is gopay.	Object	Conditional

Obtaining GoPay token
Get Pay Account API is called to retrieve GoPay Token, needed for GoPay subscriptions. Account ID can be retrieved from HTTP notification of first transaction charge that will be used to create subscription for the scheduled subsequent charges.

For the sandbox environment, refer to this [documentation] to learn how to obtain the GoPay token. Note that you must use specific phone numbers provided in the documentation in order to create the GoPay token required for creating a subscription.


HTTP Method	Endpoint	Definition
GET	BASE_URL/v2/pay/account/account_id	Get GoPay's account information and linked status.

Sample Response - Enabled

{
  "status_code": "200",
  "payment_type": "gopay",
  "account_id": "00000269-7836-49e5-bc65-e592afafec14",
  "account_status": "ENABLED",
  "metadata": {
    "payment_options": [
      {
        "name": "GOPAY_WALLET",
        "active": true,
        "balance": {
          "value": "1000000.00",
          "currency": "IDR"
        },
        "metadata": {},
        "token": "eyJ0eXBlIjogIkdPUEFZX1dBTExFVCIsICJpZCI6ICIifQ==" // The token is used for Subscription 
      }
    ]
  }
}

Obtaining card token & GoPay account ID via Get Transaction API
Get Transaction API is used to get card token that has been saved in the first transaction charge facilitated in a One Click flow, or GoPay account_id mapped to the user_id passed during create Snap Token creation, that is needed to make the subsequent scheduled charges with Subscription API.


HTTP Method	Endpoint	Definition
GET	BASE_URL/v2/{order_id OR transaction_id}/status	Get the status of transaction and card information.

Sample Response - Enabled

{
    "masked_card": "48111111-1114",
    "approval_code": "1689306913393",
    "bank": "cimb",
    "eci": "05",
    "saved_token_id": "48111111ktaqYoxJQAGvXBoxEPqO1114", // The token is used for Subscription 
    "saved_token_id_expired_at": "2024-11-30 07:00:00",
    "channel_response_code": "00",
    "channel_response_message": "Approved",
    "three_ds_version": "2",
    "transaction_time": "2023-07-14 10:55:09",
    "gross_amount": "20000.00",
    "currency": "IDR",
    "order_id": "sample-store-1689306888",
    "payment_type": "credit_card",
    "signature_key": "40df7114b015e899526f78f98ff7a0297fa8ba270e5a436687af9cfee2ec471444dd239834d8836f217b1bdf12e9677cb65643470dc666c578fb120b8135480b",
    "status_code": "200",
    "transaction_id": "a4e2f006-2cc1-4110-ac38-811e4c427199",
    "transaction_status": "capture",
    "fraud_status": "accept",
    "expiry_time": "2023-07-14 11:05:09",
    "status_message": "Success, Credit Card transaction is successful",
    "merchant_id": "M123",
    "card_type": "credit",
    "challenge_completion": true
}


OPTIONAL : Authenticating first transaction for GoPay Subscription

All payment transactions beyond the linking step will not have an additional authentication challenge e.g. PIN challenge in GoPay app. As such all additional authentication - if deemed as needed- will need to be set up in merchant's web/app directly between merchant and customers, before initiating the payment charge to Subscription API.

Do note that during onboarding, you might be required to perform authentication on first transaction - this is referring to merchant's own authentication, as this is not part of Subscription API / GoPay Tokenization payment flow.



Create Subscription Sample Response
Success - Card
Success - GoPay
Status Code: 400
Status Code: 500

{
  "id": "d98a63b8-97e4-4059-825f-0f62340407e9",
  "name": "MONTHLY_2019",
  "amount": "14000",
  "currency": "IDR",
  "created_at": "2019-05-29T09:11:01.810452",
  "schedule": {
    "interval": 1,
    "interval_unit": "month",
    "start_time": "2019-05-29T09:11:01.803677",
    "previous_execution_at": "2019-05-29T09:11:01.803677",
    "next_execution_at": "2019-06-29T09:11:01.803677"
  },
  "retry_schedule": {
    "interval": 1,
    "interval_unit": "day",
    "max_interval": 3,
  },
  "status": "active",
  "token": "48111111sHfSakAvHvFQFEjTivUV1114",
  "payment_type": "credit_card",
  "metadata": {
    "description": "Recurring payment for A"
  },
  "customer_details": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "johndoe@email.com",
    "phone": "+62812345678"
  }
}
JSON Attribute	Description	Type	Notes
id	Subscription ID given by Midtrans.	String	
name	Subscription name specified by you.	String	
amount	Amount specified by you for recurring charge.	String	
currency	ISO-4217 representation of three-letter alphabetic currency code. Value: IDR.
Note: Currently only IDR is supported.	String	
created_at	Subscription schedule creation timestamp in ISO 8601 format. Time Zone: GMT + 7.	String	
schedule	Details of the subscription schedule.	Object	
retry_schedule	Details of the retry subscription schedule.	Object	
status	Current subscription status.
Possible values are active, inactive.	String	
token (Card Payment)	The saved_token_id for Card Payment. Credit Card token retrieved via Get Pay Account API.	String	
token (GoPay)	Token that is retrieved via Get Pay Account API	String	
payment_type	The payment method used by the customer. Value: credit_card.
Note: Currently only credit_card and gopay are supported.	String	
metadata	Metadata of subscription specified by you.
Note: Limit the size to less than 1KB.	Object	Conditional
customer_details	Details of the customer.	Object	
status_message	Description of the error.	String	
validation_message	Detailed description of the error.	Array(String)	
account_id (GoPay)	GoPay account ID	String	

Retry Mechanism if Subscription Fails

If for some reason deduction fails, Midtrans will perform automatic retries 3 times for every one hour by default (unless customized) before marking subscription as inactive. Retries for every charge will be attempted until exhausted regardless of subscription's status. To test for the automatic retries, you can try to simulate with cases that returns error such as incorrect card token, or GoPay account is in unlinked state prior to charge.

If you do not want to retry your failed subscription charge, simply specify the max_interval parameter in the retry_schedule object as 0.


📘
Retry notification

Note that Midtrans Payment API will send HTTP notification for every transactions' attempt; while Midtrans's Subscription API will send a separate notification at the end of retry attempt cycle of every transaction or once retry is successful. As such, use Subscription HTTP notification should be referred to when handling failed or success subscriptions.


Example of retry schedules :
There's a payment that's failed to be processed at 11 Oct 2022 15.48 GMT+7. Then, Midtrans will automatically retry at :

11 Oct 2022 16.48 GMT+7
11 Oct 2022 17.48 GMT+7
11 Oct 2022 18.48 GMT+7

OPTIONAL - Accepting Subscription in Snap Checkout

Use this object to show a dedicated recurring flow UI in Snap - differences include card will be automatically saved without having user manually tick the checkbox and adjusted copy to better suit recurring payments. Snap will then return the information passed here back in HTTP notification, for you to utilize when creating a subscription via the Subscription API.

Use this object in conjunction with Subscription API - add this object to alter the Snap customer UI, then convert the transaction to recurring payments using Subscription API. Make sure to also have the prerequisites to accept Subscription (e.g. One Click feature) - otherwise transactions might fail.

Note that if you do choose to pass the start_time and interval_unit within the object, make sure to use the same information when calling the Subscription API - otherwise, information presented to user and actual subscription charge schedule will be different, which might result in chargeback.


JSON Parameters

...
"recurring": {
    "required": true,
    "start_time": "2024-06-09 15:07:00 +0700",
    "interval_unit": "week"
}
...
Parameter	Description	Type	Required
required	Specify the intent whether payment will be utilizing recurring payments or not.	Integer	Required (if recurring object is passed)
start_time	Start of the subscription schedule. Passed information will be shown in Snap Checkout UI & returned in HTTP Notification.	String	Optional
interval_unit	Subscription charge internal unit	String	Optional

Get Subscription
get
https://api.sandbox.midtrans.com/v1/subscriptions/{subscription_id}
Recent Requests
time	status	user agent	
Make a request to see history.
0 Requests This Month

Retrieve the subscription details of a customer using the subscription_id. Successful request returns subscription object and status:active.



Get Subscription Method
HTTP Method	Endpoint	Description
GET	BASE_URL/v1/subscriptions/{subscription_id}	Retrieve subscription details


Get Subscription Response
Card Sample Response - Success
GoPay Sample Response - Success
Sample Response - Status Code: 404
Sample Response - Status Code: 500

{
  "id": "d98a63b8-97e4-4059-825f-0f62340407e9",
  "name": "MONTHLY_2019",
  "amount": "14000",
  "currency": "IDR",
  "created_at": "2019-05-29T09:11:01.810452",
  "schedule": {
    "interval": 1,
    "interval_unit": "month",
    "current_interval" : 1,
    "start_time": "2019-05-29T09:11:01.803677",
    "previous_execution_at": "2019-05-29T09:11:01.803677",
    "next_execution_at": "2019-06-29T09:11:01.803677"
  },
  "status": "active",
  "token": "48111111sHfSakAvHvFQFEjTivUV1114",
  "payment_type": "credit_card",
  "transaction_ids": [
    "9beb839d-8fe2-41ec-bc5e-045e5001d286",
    "eb47cd5d-acd3-4e53-a155-7bd41aa38052",
    "9d286585-bd19-43be-95dc-da3d32ab18af",
    "ec3175c6-9f0a-4ce5-9332-abfb1db0852f",
    "00f7d40d-26e2-4624-a797-9ddc54ca9987",
    "421bd123-d8b2-4476-bcea-165f9e176cbb"
  ],
  "metadata": {
    "description": "Recurring payment for A"
  },
  "customer_details": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "johndoe@email.com",
    "phone": "+62812345678"
  }
}
JSON Attribute	Description	Type
id	Subscription ID given by Midtrans.	String
name	Subscription name given by you.	String
amount	Amount specified by you for recurring charge.	String
currency	ISO-4217 representation of three-letter alphabetic currency code. Value: IDR.
Note: Currently only IDR is supported.	String
created_at	Timestamp at which the subscription schedule is created in ISO 8601 format. Time Zone (GMT+7).	String
schedule	Details of the subscription schedule.	Object
status	Current subscription Status.
Note: Possible status values are active and inactive.	String
token	Payment token used for subscription.	String
payment_type	The payment method used by the customer. Value: credit_card.
Note: Currently only credit_card and gopay are supported.	String
transaction_ids	List of transaction IDs which are successfully charged.	Array(String)
metadata	Metadata of subscription specified by you.
Note: Limit the size to less than 1KB.	Object
customer_details	Details of the customer.	Object
status_message	Description of the error	String

Disable Subscription
post
https://api.sandbox.midtrans.com/v1/subscriptions/{subscription_id}/disable
Recent Requests
time	status	user agent	
Make a request to see history.
0 Requests This Month

Disable a customer's subscription account with a specific subscription_id so that the customer is not charged for the subscription in the future. Successful request returns status_message indicating that the subscription details are updated.

📘
Note

Disable subscription does not stop any pending retries on subscription. Pending retry is caused by failure on previous subscription payment. Any pending retries will still be executed after subscription is disabled for trying to resolve previous pending payments.

To disable subscription and stop all pending retries, you can use Cancel Subscription instead.


Disable Subscription Method
HTTP Method	Endpoint	Description
POST	BASE_URL/v1/subscriptions/{subscription_id}/disable	Disable subscription


Disable Subscription Response
Sample Response - Success
Sample Response - Status Code: 404
Sample Response - Status Code: 500

{
  "status_message": "Subscription is updated."
}
JSON Attribute	Description	Type
status_message	Message describing the status of the result of API request.	String

Cancel Subscription
post
https://api.sandbox.midtrans.com/v1/subscriptions/{subscription_id}/cancel
Recent Requests
time	status	user agent	
Make a request to see history.
0 Requests This Month

Cancel a customer's subscription account with a specific subscription_id so that the customer is not charged for the subscription in the future. Successful request returns status_message indicating that the subscription details are updated.

The difference between cancel subscription and disable subscription is that cancel subscription also stop any pending retries on subscription due to previous failure on charging customer (might be caused by timeout to payment provider or customer balance is insufficient).



Cancel Subscription Method
HTTP Method	Endpoint	Description
POST	BASE_URL/v1/subscriptions/{subscription_id}/cancel	Cancel subscription


Disable Subscription Response
Sample Response - Success
Sample Response - Status Code: 404
Sample Response - Status Code: 500

{
  "status_message": "Subscription is updated."
}
JSON Attribute	Description	Type
status_message	Message describing the status of the result of API request.	String

Enable Subscription
post
https://api.sandbox.midtrans.com/v1/subscriptions/{subscription_id}/enable
Recent Requests
time	status	user agent	
Make a request to see history.
0 Requests This Month

Activate a customer's subscription account with a specific subscription_id, so that the customer can start paying for the subscription immediately. Successful request returns status_message indicating that the subscription details are updated.



Enable Subscription Method
HTTP Method	Endpoint	Description
POST	BASE_URL/v1/subscriptions/{subscription_id}/enable	Enable subscription


Enable Subscription Response
Sample Response - Success
Sample Response - Status Code: 404
Sample Response - Status Code: 500

{
  "status_message": "Subscription is updated."
}
JSON Attribute	Description	Type
status_message	Status message describing the result of the API request.	String

Update Subscription
patch
https://api.sandbox.midtrans.com/v1/subscriptions/{subscription_id}
Recent Requests
time	status	user agent	
Make a request to see history.
0 Requests This Month

Update the details of a customer's existing subscription account with the specific subscription_id. Successful request returns status_message indicating that the subscription details are updated. You can also use the API to reactivate expired/dead subscriptions by updating the subscription's schedule.



Update Subscription Method
HTTP Method	Endpoint	Description
PATCH	BASE_URL/v1/subscriptions/{subscription_id}	Update subscription
Sample Request Body
Sample Response - Successful
Sample Response - Status Code: 404
Sample Response - Status Code: 500

{
    "name": "MONTHLY_2019",
    "amount": "14000",
    "currency": "IDR",
    "token": "48111111sHfSakAvHvFQFEjTivUV1114",
    "schedule": {
      "interval": 1
    },
    "retry_schedule": {
      "interval": 1,
      "interval_unit": "day",
          "max_interval": 3,
    },
    "gopay": {
      "account_id": "0dd2cd90-a9a9-4a09-b393-21162dfb713b"
    }
}

Update Subscription Request
JSON Attribute	Description	Type	Required
name	Subscription name specified by you.
Note: Allowed symbols are dash(-), underscore(_), tilde (~), and dot (.).	String(15)	Required
amount	Amount specified by you for recurring charge.	String	Required
currency	ISO-4217 representation of three-letter alphabetic currency code. Value: IDR.
Note: Currently only IDR is supported.	String	Required
token	Saved payment token.
Note: For credit_card, use saved_token_id received in Charge response.	String	Required
schedule	Update an ongoing subscription's schedule, or reactivate an expired subscription by updating the schedule.	Object	Optional
retry_schedule	Update an ongoing subscription's retry schedule over failed charge.	Object	Optional
gopay	GoPay subscription information.	Object	Optional


Update Subscription Response
JSON Attribute	Description	Type
status_message	Message describing the status of the result of API request.	String

📘
Note

Payment method cannot be updated in the middle of subscription. If merchant wish to change the payment method of an active subscription, the subscription must be disabled first. After that, new subscription with same data can be created again with different payment method.

Inside schedule, only interval field can be updated. schedule.interval_unit and schedule.max_interval can not be updated.

Any updates to the subscription interval schedule will only be effective after the next scheduled payment is processed. For example, consider a subscription scheduled to run at the end of this month. If you update the interval field in the middle of the month, change will take effect from the next month. For other parameters, the change will be effective starting from the next scheduled payment.

To reactivate dead subscriptions, simply update the subscription schedule with future dates. Subscription will then reactivate and resume charging the customer at the date specified at next_execution_at.

HTTP Notification
Prior to using, ensure that you've set your Subscription HTTP notification URL in Midtrans's dashboard in the Recurring Notification URL field.

Here are some examples of possible JSON responses as HTTP notification in recurring API for:

successful subscription creation
successful credit card payment
successful GoPay payment
failed credit card payment
failed GoPay payment
Successful card subs creation
Successfull GoPay subs creation
Successful card payment
Successful GoPay payment
Failed card payment
Failed GoPay payment

{
  "token": "8447a56f-0e5e-498a-a948-eefa88265544",
  "status": "active",
  "schedule": {
    "start_time": "2022-10-26T04:20:00.000000Z",
    "next_execution_at": "2022-10-26T04:20:00.000000Z",
    "interval_unit": "month",
    "interval": 1,
    "current_interval": 0
    },
  "payment_type": "credit_card",
  "name": "SUBSCRIBE-1666753619",
  "metadata": {
    "meta": "data"
  },
  "merchant_id": "M099098",
  "id": "a05a8d85-8e22-4a9d-80bd-1e6199aea3f3",
  "customer_details": {
    "first_name": "John"
  },
  "currency": "IDR",
  "amount": "14000"
}