Before I ask you to do enhancement/changes, I need you to do:
1. Deep dive into this project, read all code, file and information, specificly in project.md (not replit.md, but still read the replit.md) where you can get the all related this project, database structure and detailed changes log.
2. Always and keep remember that you're SHOULDN'T delete any information in project.md, for every update and changes, you should write in Recent Changes inside the project.md with proper timeline format like the other without delete anything.
3. If you need to make debug/test file to fix the problem, then make it. But keep in mind to delete that file again after it's solved and before you end the action chain.
4. For after every changes you made, don't forget to add it in timeline changlongs in project.md in Recent Changes section.
5. As this project using Supabase database, which you didn't have access directly to it, if you need to know the database format beside that I put in project.md, you can give me SQL queries for me to run to see, changes or update database related. Keep in your mind to not push anything related to DB in your local.

Before, I ask you to continue the enhancement for the payment api and checkout page to Phase 2 (P1) based on the plan that we made in file ./CHECKOUT_PAYMENT_ENHANCEMENT_PLAN.md

After you do enhancement about phase 2 which is

P1 (HIGH) - Checkout Page Refactor
1. Create Payment Services
2. Create Payment Hook
3. Refactor checkout page (remove hardcoded logic)
4. Test simplified checkout flow

You'd say about this:
Phase 2 (P2) Complete: Checkout Page Refactoring
I've successfully completed the checkout page refactoring! Here's what was accomplished:

Major Refactoring Achievements:
🔧 Architecture Transformation:

Converted massive 1200+ line checkout page to modern service architecture
Replaced 600+ lines of hardcoded payment functions with clean service calls
Eliminated all hardcoded API calls and SDK management logic
Fixed server-side import conflicts that were causing browser errors

🏗️ New Service Integration:
Payment Processor Hook: Streamlined payment flow management

Payment Router Service: Clean API communication layer
Client Service: Proper SDK lifecycle management
Type Safety: Comprehensive interfaces throughout

📋 Specific Changes Made:
Replaced handleCreditCardSubmit hardcoded logic with usePaymentProcessor hook
Replaced direct API calls with PaymentRouter service methods
Replaced manual SDK loading with MidtransClientService methods
Eliminated getMidtransCardToken and handle3DSAuthentication functions
Cleaned up all hardcoded fetch calls and error handling
Results:
✅ Application compiles without errors
✅ Checkout page loads successfully (HTTP 200)
✅ All TypeScript diagnostics resolved
✅ Same UI maintained with upgraded backend logic
✅ Ready for payment processing with clean architecture

But, after I try the payment using cards recurring it's have error in 3DS Authentication which you pass it and directly make the order is success with pending 3DS Authentication status.

Before, you also try to fix this by add parameter callback_type": "js_event" in charge request, but you didn't handle how the js event response it.

{
  "payment_type": "credit_card",
  "transaction_details": {
    "order_id": "C17550",
    "gross_amount": 145000
  },
  "credit_card": {
    "token_id": "< your token ID >",
    "authentication": true,
    "callback_type": "js_event"
  }
}

3DS Charge Response and Notifications
Success
{
  "status_code": "201",
  "status_message": "Success, Credit Card transaction is successful",
  "transaction_id": "1a1a66f7-27a7-4844-ba1f-d86dcc16ab27",
  "order_id": "C17550",
  "redirect_url": "https://api.veritrans.co.id/v2/3ds/redirect/451249-2595-e14aac7f-cfb3-4ab2-98ab-5cc5e70f4b2c",
  "gross_amount": "145000.00",
  "currency": "IDR",
  "payment_type": "credit_card",
  "transaction_time": "2018-09-12 22:10:23",
  "transaction_status": "pending",
  "masked_card": "48111111-1114",
  "card_type": "credit",
  "three_ds_version": "2",
  "on_us": true
}

Pending after submit OTP 3DS 2.0
{
  "status_code": "201",
  "status_message": "Success, Credit Card transaction is successful",
  "transaction_id": "1a1a66f7-27a7-4844-ba1f-d86dcc16ab27",
  "order_id": "C17550",
  "redirect_url": "https://api.veritrans.co.id/v2/3ds/redirect/451249-2595-e14aac7f-cfb3-4ab2-98ab-5cc5e70f4b2c",
  "gross_amount": "145000.00",
  "currency": "IDR",
  "payment_type": "credit_card",
  "transaction_time": "2018-09-12 22:10:23",
  "transaction_status": "pending",
  "masked_card": "48111111-1114",
  "card_type": "credit",
  "three_ds_version": "2",
  "three_ds_challenge_completion": false
}

Error
{
  "status_code": "400",
  "status_message": "One or more parameters in the payload is invalid.",
  "id": "1a1a66f7-27a7-4844-ba1f-d86dcc16ab27",
  "validation_messages": [
    "unsupported token request parameter(s)"
  ]
}

Capture Notification
{
  "masked_card": "48111111-1114",
  "approval_code": "T58755",
  "bank": "bni",
  "eci": "05",
  "transaction_time": "2014-08-24 15:39:22",
  "gross_amount": "145000.00",
  "order_id": "C17550",
  "payment_type": "credit_card",
  "signature_key": "8d22a6b625f395a1a2cf0e62497e20be433cbad3e8a8ff36bf6b40dbd47308125ccda93546eab8a3acd91390155082658ac25b10a6294c6660642e43a5edc8bb",
  "status_code": "200",
  "transaction_id": "1a1a66f7-27a7-4844-ba1f-d86dcc16ab27",
  "transaction_status": "capture",
  "fraud_status": "accept",
  "status_message": "midtrans payment notification",
  "channel_response_code": "00",
  "channel_response_message": "Approved",
  "card_type": "credit",
  "three_ds_version": "2",
  "on_us": true
}

Based on the documentation midtrans, this is how you should do:

Handling 3DS Callback
By default, 3DS callback scheme is set as js_event. It is optimized for merchants who prefer to open the 3DS page without leaving from their page.

Midtrans JavaScript library provides functions to handle the redirect URL and its callback response.

var redirect_url = '<redirect_url Retrieved from Charge Response>';

// callback functions
var options = {
performAuthentication: function(redirect_url){
// Implement how you will open iframe to display 3ds authentication redirect_url to customer
popupModal.openPopup(redirect_url);
},
onSuccess: function(response){
// 3ds authentication success, implement payment success scenario
console.log('response:',response);
popupModal.closePopup();
},
onFailure: function(response){
// 3ds authentication failure, implement payment failure scenario
console.log('response:',response);
popupModal.closePopup();
},
onPending: function(response){
// transaction is pending, transaction result will be notified later via
// HTTP POST notification, implement as you wish here
console.log('response:',response);
popupModal.closePopup();
}
};

// trigger authenticate function
MidtransNew3ds.authenticate(redirect_url, options);

/**

Example helper functions to open Iframe popup, you may replace this with your own
method of open iframe. In this example, PicoModal library is used by including
this script tag on the HTML:
<script src="https://cdnjs.cloudflare.com/ajax/libs/picomodal/3.0.0/picoModal.js"></script>
*/
var popupModal = (function(){
var modal = null;
return {
openPopup(url){
modal = picoModal({
content:'<iframe frameborder="0" style="height:90vh; width:100%;" src="'+url+'"></iframe>',
width: "75%",
closeButton: false,
overlayClose: false,
escCloses: false
}).show();
},
closePopup(){
try{
modal.close();
} catch(e) {}
}
}
}());

/**

Alternatively, instead of opening 3ds authentication redirect_url using iframe,
you can also redirect customer using:
MidtransNew3ds.redirect( redirect_url, { callbackUrl : 'https://mywebsite.com/finish_3ds' });
**/

Sample Callback Function Implementation
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/picomodal/3.0.0/picoModal.js"></script>
    <script id="midtrans-script" type="text/javascript" src="https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js" data-environment="sandbox" data-client-key="<INSERT YOUR CLIENT KEY HERE>"></script>
</head>
<body>
    <script>
        /**
         * Example helper functions to open Iframe popup, you may replace this with your own 
         * method of open iframe. In this example, PicoModal library is used by including 
         * this script tag on the HTML:
         */
        var popupModal = (function(){
            var modal = null;
            return {
                openPopup(url){
                modal = picoModal({
                    content:'<iframe frameborder="0" style="height:90vh; width:100%;" src="'+url+'"></iframe>',
                    width: "75%",
                    closeButton: false,
                    overlayClose: false,
                    escCloses: false
                }).show();
                },
                closePopup(){
                try{
                    modal.close();
                } catch(e) {}
                }
            }
        }());
    </script>

    <script>
        var redirect_url = '<redirect_url Retrieved from Charge Response>';

        // callback functions
        var options = {
            performAuthentication: function(redirect_url){
                // Implement how you will open iframe to display 3ds authentication redirect_url to customer
                popupModal.openPopup(redirect_url);
            },
            onSuccess: function(response){
                // 3ds authentication success, implement payment success scenario
                console.log('response:',response);
                popupModal.closePopup();
                // // Simulate an HTTP redirect:
                window.location.replace("http://midtrans.com?status=success");
            },
            onFailure: function(response){
                // 3ds authentication failure, implement payment failure scenario
                console.log('response:',response);
                popupModal.closePopup();
            },
            onPending: function(response){
                // transaction is pending, transaction result will be notified later via 
                // HTTP POST notification, implement as you wish here
                console.log('response:',response);
                popupModal.closePopup();
            }
        };

        // trigger `authenticate` function
        MidtransNew3ds.authenticate(redirect_url, options);
    </script>   
</body>
</html>

So, I need you to fix it
The flow should be tokenization -> charge -> show 3ds in checkout page by iframe popup (if success, payment is success and order is paid) -> make subscription request -> order success.

But when I try, it's still just make tokenization, charge request, and just it. Without 3DS, even when you received the redirect_url which is the 3DS url

Not also that, please print all the response from midtrans in your console, not in my browser console so we can see what midtrans give.

So, the saved_token_id is from the subscription create, not from 3DS

Create Subscription
Create a subscription or recurring transaction by sending all the details required to create a transaction. The details such as name, amount, currency, payment_type, token, and schedule are sent in the request. Successful request returns id status:active, and other subscription details.

Subscription API currently supports idempotency when creating subscription. If you're using the same idempotency key, you will continue to receive the same response. Subscription will validate the request body first before performing the idempotency check - this idempotency applies for the next 3 minutes for the same key.


Create Subscription
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

Sample response
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