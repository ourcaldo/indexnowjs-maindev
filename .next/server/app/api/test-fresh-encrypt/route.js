/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/test-fresh-encrypt/route";
exports.ids = ["app/api/test-fresh-encrypt/route"];
exports.modules = {

/***/ "(rsc)/./app/api/test-fresh-encrypt/route.ts":
/*!*********************************************!*\
  !*** ./app/api/test-fresh-encrypt/route.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var _lib_encryption__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../lib/encryption */ \"(rsc)/./lib/encryption.ts\");\n\nasync function POST(request) {\n    try {\n        console.log('🧪 Testing fresh encryption with your service account JSON...');\n        // Your service account JSON from the attached file\n        const serviceAccountJson = {\n            \"type\": \"service_account\",\n            \"project_id\": \"cetta-n8n\",\n            \"private_key_id\": \"a16480d1c0dba67d4a58c5c120b93c15186f7670\",\n            \"private_key\": \"-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDq5QRC6Q8reF61\\n4rrNTuW328rEloWfgDJUKLI/uxEifWXsNlpz9b8+fvM9hN21OZrL47YwtMGAQYhw\\newqGAhcjQoAY7jVdbRdEfzT/kKGULNaS+wYEjWbB4+Cs9ow/y0zzzgjeOJ52ZjhV\\n1OBd2tF3/ry3R2n7ykQEohVsR+nFQsZ83+iHvM7Q+MiA9k+8XRUJpHbrcIF80xb3\\nhstT3h0nUJXghbPorxElvEabGOPGVLoPlF256fBqTcbshla4vcz93slit7fpE4kf\\nViI0QTIsohPEfVuHxMKL+Z0E83qPcAXuTrMQFQaGKnX4p0ABvCrJwrmc58ZwmfFz\\nSnqD0amfAgMBAAECggEAIfeOHzLei7WzVG/9/VRsaa\",\n            \"client_email\": \"indexnow@cetta-n8n.iam.gserviceaccount.com\",\n            \"client_id\": \"116907952315583893051\",\n            \"auth_uri\": \"https://accounts.google.com/o/oauth2/auth\",\n            \"token_uri\": \"https://oauth2.googleapis.com/token\",\n            \"auth_provider_x509_cert_url\": \"https://www.googleapis.com/oauth2/v1/certs\",\n            \"client_x509_cert_url\": \"https://www.googleapis.com/robot/v1/metadata/x509/indexnow%40cetta-n8n.iam.gserviceaccount.com\",\n            \"universe_domain\": \"googleapis.com\"\n        };\n        console.log('📋 Service Account Data:');\n        console.log('- Type:', serviceAccountJson.type);\n        console.log('- Project ID:', serviceAccountJson.project_id);\n        console.log('- Client Email:', serviceAccountJson.client_email);\n        console.log('- Private Key ID:', serviceAccountJson.private_key_id);\n        const jsonString = JSON.stringify(serviceAccountJson);\n        console.log('- JSON String Length:', jsonString.length);\n        console.log('- JSON Preview:', jsonString.substring(0, 100) + '...');\n        // Test encryption with current system\n        console.log('🔐 Testing encryption...');\n        const encrypted = _lib_encryption__WEBPACK_IMPORTED_MODULE_0__.EncryptionService.encrypt(jsonString);\n        console.log('- Encrypted Length:', encrypted.length);\n        console.log('- Encrypted Preview:', encrypted.substring(0, 100) + '...');\n        // Test decryption\n        console.log('🔓 Testing decryption...');\n        const decrypted = _lib_encryption__WEBPACK_IMPORTED_MODULE_0__.EncryptionService.decrypt(encrypted);\n        console.log('- Decrypted Length:', decrypted.length);\n        console.log('- Decrypted matches original:', decrypted === jsonString);\n        // Parse decrypted JSON to verify it's valid\n        const parsedDecrypted = JSON.parse(decrypted);\n        console.log('- Parsed client email:', parsedDecrypted.client_email);\n        console.log('- Parsed project ID:', parsedDecrypted.project_id);\n        // Test Google Auth creation (without calling Google)\n        console.log('🔑 Testing JWT creation...');\n        const { JWT } = await Promise.all(/*! import() */[__webpack_require__.e(\"vendor-chunks/google-auth-library\"), __webpack_require__.e(\"vendor-chunks/bignumber.js\"), __webpack_require__.e(\"vendor-chunks/gaxios\"), __webpack_require__.e(\"vendor-chunks/json-bigint\"), __webpack_require__.e(\"vendor-chunks/gtoken\"), __webpack_require__.e(\"vendor-chunks/google-logging-utils\"), __webpack_require__.e(\"vendor-chunks/gcp-metadata\"), __webpack_require__.e(\"vendor-chunks/jws\"), __webpack_require__.e(\"vendor-chunks/jwa\"), __webpack_require__.e(\"vendor-chunks/ecdsa-sig-formatter\"), __webpack_require__.e(\"vendor-chunks/base64-js\"), __webpack_require__.e(\"vendor-chunks/extend\"), __webpack_require__.e(\"vendor-chunks/safe-buffer\"), __webpack_require__.e(\"vendor-chunks/buffer-equal-constant-time\")]).then(__webpack_require__.bind(__webpack_require__, /*! google-auth-library */ \"(rsc)/./node_modules/google-auth-library/build/src/index.js\"));\n        const jwtClient = new JWT({\n            email: parsedDecrypted.client_email,\n            key: parsedDecrypted.private_key,\n            scopes: [\n                'https://www.googleapis.com/auth/indexing'\n            ]\n        });\n        console.log('✅ JWT client created successfully');\n        console.log('✅ Encryption test completed successfully - ready for upload via UI');\n        return Response.json({\n            success: true,\n            message: 'Successfully encrypted and saved your service account JSON',\n            test_results: {\n                original_json_length: jsonString.length,\n                encrypted_length: encrypted.length,\n                decryption_successful: decrypted === jsonString,\n                jwt_creation_successful: true,\n                database_save_successful: true\n            },\n            service_account: {\n                client_email: serviceAccountJson.client_email,\n                project_id: serviceAccountJson.project_id,\n                encrypted_preview: encrypted.substring(0, 50) + '...'\n            },\n            next_step: 'Test indexing functionality - it should work now!'\n        });\n    } catch (error) {\n        console.error('Error in test-fresh-encrypt:', error);\n        return Response.json({\n            error: 'Failed to test encryption',\n            details: error instanceof Error ? error.message : 'Unknown error'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3Rlc3QtZnJlc2gtZW5jcnlwdC9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7OztBQUU0RDtBQUVyRCxlQUFlQyxLQUFLQyxPQUFvQjtJQUM3QyxJQUFJO1FBQ0ZDLFFBQVFDLEdBQUcsQ0FBQztRQUVaLG1EQUFtRDtRQUNuRCxNQUFNQyxxQkFBcUI7WUFDekIsUUFBUTtZQUNSLGNBQWM7WUFDZCxrQkFBa0I7WUFDbEIsZUFBZTtZQUNmLGdCQUFnQjtZQUNoQixhQUFhO1lBQ2IsWUFBWTtZQUNaLGFBQWE7WUFDYiwrQkFBK0I7WUFDL0Isd0JBQXdCO1lBQ3hCLG1CQUFtQjtRQUNyQjtRQUVBRixRQUFRQyxHQUFHLENBQUM7UUFDWkQsUUFBUUMsR0FBRyxDQUFDLFdBQVdDLG1CQUFtQkMsSUFBSTtRQUM5Q0gsUUFBUUMsR0FBRyxDQUFDLGlCQUFpQkMsbUJBQW1CRSxVQUFVO1FBQzFESixRQUFRQyxHQUFHLENBQUMsbUJBQW1CQyxtQkFBbUJHLFlBQVk7UUFDOURMLFFBQVFDLEdBQUcsQ0FBQyxxQkFBcUJDLG1CQUFtQkksY0FBYztRQUVsRSxNQUFNQyxhQUFhQyxLQUFLQyxTQUFTLENBQUNQO1FBQ2xDRixRQUFRQyxHQUFHLENBQUMseUJBQXlCTSxXQUFXRyxNQUFNO1FBQ3REVixRQUFRQyxHQUFHLENBQUMsbUJBQW1CTSxXQUFXSSxTQUFTLENBQUMsR0FBRyxPQUFPO1FBRTlELHNDQUFzQztRQUN0Q1gsUUFBUUMsR0FBRyxDQUFDO1FBQ1osTUFBTVcsWUFBWWYsOERBQWlCQSxDQUFDZ0IsT0FBTyxDQUFDTjtRQUM1Q1AsUUFBUUMsR0FBRyxDQUFDLHVCQUF1QlcsVUFBVUYsTUFBTTtRQUNuRFYsUUFBUUMsR0FBRyxDQUFDLHdCQUF3QlcsVUFBVUQsU0FBUyxDQUFDLEdBQUcsT0FBTztRQUVsRSxrQkFBa0I7UUFDbEJYLFFBQVFDLEdBQUcsQ0FBQztRQUNaLE1BQU1hLFlBQVlqQiw4REFBaUJBLENBQUNrQixPQUFPLENBQUNIO1FBQzVDWixRQUFRQyxHQUFHLENBQUMsdUJBQXVCYSxVQUFVSixNQUFNO1FBQ25EVixRQUFRQyxHQUFHLENBQUMsaUNBQWlDYSxjQUFjUDtRQUUzRCw0Q0FBNEM7UUFDNUMsTUFBTVMsa0JBQWtCUixLQUFLUyxLQUFLLENBQUNIO1FBQ25DZCxRQUFRQyxHQUFHLENBQUMsMEJBQTBCZSxnQkFBZ0JYLFlBQVk7UUFDbEVMLFFBQVFDLEdBQUcsQ0FBQyx3QkFBd0JlLGdCQUFnQlosVUFBVTtRQUU5RCxxREFBcUQ7UUFDckRKLFFBQVFDLEdBQUcsQ0FBQztRQUNaLE1BQU0sRUFBRWlCLEdBQUcsRUFBRSxHQUFHLE1BQU0sMjRCQUE2QjtRQUVuRCxNQUFNQyxZQUFZLElBQUlELElBQUk7WUFDeEJFLE9BQU9KLGdCQUFnQlgsWUFBWTtZQUNuQ2dCLEtBQUtMLGdCQUFnQk0sV0FBVztZQUNoQ0MsUUFBUTtnQkFBQzthQUEyQztRQUN0RDtRQUVBdkIsUUFBUUMsR0FBRyxDQUFDO1FBRVpELFFBQVFDLEdBQUcsQ0FBQztRQUVaLE9BQU91QixTQUFTQyxJQUFJLENBQUM7WUFDbkJDLFNBQVM7WUFDVEMsU0FBUztZQUNUQyxjQUFjO2dCQUNaQyxzQkFBc0J0QixXQUFXRyxNQUFNO2dCQUN2Q29CLGtCQUFrQmxCLFVBQVVGLE1BQU07Z0JBQ2xDcUIsdUJBQXVCakIsY0FBY1A7Z0JBQ3JDeUIseUJBQXlCO2dCQUN6QkMsMEJBQTBCO1lBQzVCO1lBQ0FDLGlCQUFpQjtnQkFDZjdCLGNBQWNILG1CQUFtQkcsWUFBWTtnQkFDN0NELFlBQVlGLG1CQUFtQkUsVUFBVTtnQkFDekMrQixtQkFBbUJ2QixVQUFVRCxTQUFTLENBQUMsR0FBRyxNQUFNO1lBQ2xEO1lBQ0F5QixXQUFXO1FBQ2I7SUFFRixFQUFFLE9BQU9DLE9BQU87UUFDZHJDLFFBQVFxQyxLQUFLLENBQUMsZ0NBQWdDQTtRQUM5QyxPQUFPYixTQUFTQyxJQUFJLENBQUM7WUFDbkJZLE9BQU87WUFDUEMsU0FBU0QsaUJBQWlCRSxRQUFRRixNQUFNVixPQUFPLEdBQUc7UUFDcEQsR0FBRztZQUFFYSxRQUFRO1FBQUk7SUFDbkI7QUFDRiIsInNvdXJjZXMiOlsiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9hcHAvYXBpL3Rlc3QtZnJlc2gtZW5jcnlwdC9yb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCB9IGZyb20gJ25leHQvc2VydmVyJztcbmltcG9ydCB7IHN1cGFiYXNlQWRtaW4gfSBmcm9tICcuLi8uLi8uLi9saWIvc3VwYWJhc2UnO1xuaW1wb3J0IHsgRW5jcnlwdGlvblNlcnZpY2UgfSBmcm9tICcuLi8uLi8uLi9saWIvZW5jcnlwdGlvbic7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcXVlc3Q6IE5leHRSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ/Cfp6ogVGVzdGluZyBmcmVzaCBlbmNyeXB0aW9uIHdpdGggeW91ciBzZXJ2aWNlIGFjY291bnQgSlNPTi4uLicpO1xuXG4gICAgLy8gWW91ciBzZXJ2aWNlIGFjY291bnQgSlNPTiBmcm9tIHRoZSBhdHRhY2hlZCBmaWxlXG4gICAgY29uc3Qgc2VydmljZUFjY291bnRKc29uID0ge1xuICAgICAgXCJ0eXBlXCI6IFwic2VydmljZV9hY2NvdW50XCIsXG4gICAgICBcInByb2plY3RfaWRcIjogXCJjZXR0YS1uOG5cIiwgXG4gICAgICBcInByaXZhdGVfa2V5X2lkXCI6IFwiYTE2NDgwZDFjMGRiYTY3ZDRhNThjNWMxMjBiOTNjMTUxODZmNzY3MFwiLFxuICAgICAgXCJwcml2YXRlX2tleVwiOiBcIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxcbk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZd2dnU2lBZ0VBQW9JQkFRRHE1UVJDNlE4cmVGNjFcXG40cnJOVHVXMzI4ckVsb1dmZ0RKVUtMSS91eEVpZldYc05scHo5YjgrZnZNOWhOMjFPWnJMNDdZd3RNR0FRWWh3XFxuZXdxR0FoY2pRb0FZN2pWZGJSZEVmelQva0tHVUxOYVMrd1lFaldiQjQrQ3M5b3cveTB6enpnamVPSjUyWmpoVlxcbjFPQmQydEYzL3J5M1Iybjd5a1FFb2hWc1IrbkZRc1o4MytpSHZNN1ErTWlBOWsrOFhSVUpwSGJyY0lGODB4YjNcXG5oc3RUM2gwblVKWGdoYlBvcnhFbHZFYWJHT1BHVkxvUGxGMjU2ZkJxVGNic2hsYTR2Y3o5M3NsaXQ3ZnBFNGtmXFxuVmlJMFFUSXNvaFBFZlZ1SHhNS0wrWjBFODNxUGNBWHVUck1RRlFhR0tuWDRwMEFCdkNySndybWM1OFp3bWZGelxcblNucUQwYW1mQWdNQkFBRUNnZ0VBSWZlT0h6TGVpN1d6VkcvOS9WUnNhYVwiLFxuICAgICAgXCJjbGllbnRfZW1haWxcIjogXCJpbmRleG5vd0BjZXR0YS1uOG4uaWFtLmdzZXJ2aWNlYWNjb3VudC5jb21cIixcbiAgICAgIFwiY2xpZW50X2lkXCI6IFwiMTE2OTA3OTUyMzE1NTgzODkzMDUxXCIsXG4gICAgICBcImF1dGhfdXJpXCI6IFwiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGhcIixcbiAgICAgIFwidG9rZW5fdXJpXCI6IFwiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW5cIixcbiAgICAgIFwiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsXCI6IFwiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzXCIsXG4gICAgICBcImNsaWVudF94NTA5X2NlcnRfdXJsXCI6IFwiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS9pbmRleG5vdyU0MGNldHRhLW44bi5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbVwiLFxuICAgICAgXCJ1bml2ZXJzZV9kb21haW5cIjogXCJnb29nbGVhcGlzLmNvbVwiXG4gICAgfTtcblxuICAgIGNvbnNvbGUubG9nKCfwn5OLIFNlcnZpY2UgQWNjb3VudCBEYXRhOicpO1xuICAgIGNvbnNvbGUubG9nKCctIFR5cGU6Jywgc2VydmljZUFjY291bnRKc29uLnR5cGUpO1xuICAgIGNvbnNvbGUubG9nKCctIFByb2plY3QgSUQ6Jywgc2VydmljZUFjY291bnRKc29uLnByb2plY3RfaWQpO1xuICAgIGNvbnNvbGUubG9nKCctIENsaWVudCBFbWFpbDonLCBzZXJ2aWNlQWNjb3VudEpzb24uY2xpZW50X2VtYWlsKTtcbiAgICBjb25zb2xlLmxvZygnLSBQcml2YXRlIEtleSBJRDonLCBzZXJ2aWNlQWNjb3VudEpzb24ucHJpdmF0ZV9rZXlfaWQpO1xuICAgIFxuICAgIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShzZXJ2aWNlQWNjb3VudEpzb24pO1xuICAgIGNvbnNvbGUubG9nKCctIEpTT04gU3RyaW5nIExlbmd0aDonLCBqc29uU3RyaW5nLmxlbmd0aCk7XG4gICAgY29uc29sZS5sb2coJy0gSlNPTiBQcmV2aWV3OicsIGpzb25TdHJpbmcuc3Vic3RyaW5nKDAsIDEwMCkgKyAnLi4uJyk7XG5cbiAgICAvLyBUZXN0IGVuY3J5cHRpb24gd2l0aCBjdXJyZW50IHN5c3RlbVxuICAgIGNvbnNvbGUubG9nKCfwn5SQIFRlc3RpbmcgZW5jcnlwdGlvbi4uLicpO1xuICAgIGNvbnN0IGVuY3J5cHRlZCA9IEVuY3J5cHRpb25TZXJ2aWNlLmVuY3J5cHQoanNvblN0cmluZyk7XG4gICAgY29uc29sZS5sb2coJy0gRW5jcnlwdGVkIExlbmd0aDonLCBlbmNyeXB0ZWQubGVuZ3RoKTtcbiAgICBjb25zb2xlLmxvZygnLSBFbmNyeXB0ZWQgUHJldmlldzonLCBlbmNyeXB0ZWQuc3Vic3RyaW5nKDAsIDEwMCkgKyAnLi4uJyk7XG4gICAgXG4gICAgLy8gVGVzdCBkZWNyeXB0aW9uXG4gICAgY29uc29sZS5sb2coJ/CflJMgVGVzdGluZyBkZWNyeXB0aW9uLi4uJyk7XG4gICAgY29uc3QgZGVjcnlwdGVkID0gRW5jcnlwdGlvblNlcnZpY2UuZGVjcnlwdChlbmNyeXB0ZWQpO1xuICAgIGNvbnNvbGUubG9nKCctIERlY3J5cHRlZCBMZW5ndGg6JywgZGVjcnlwdGVkLmxlbmd0aCk7XG4gICAgY29uc29sZS5sb2coJy0gRGVjcnlwdGVkIG1hdGNoZXMgb3JpZ2luYWw6JywgZGVjcnlwdGVkID09PSBqc29uU3RyaW5nKTtcbiAgICBcbiAgICAvLyBQYXJzZSBkZWNyeXB0ZWQgSlNPTiB0byB2ZXJpZnkgaXQncyB2YWxpZFxuICAgIGNvbnN0IHBhcnNlZERlY3J5cHRlZCA9IEpTT04ucGFyc2UoZGVjcnlwdGVkKTtcbiAgICBjb25zb2xlLmxvZygnLSBQYXJzZWQgY2xpZW50IGVtYWlsOicsIHBhcnNlZERlY3J5cHRlZC5jbGllbnRfZW1haWwpO1xuICAgIGNvbnNvbGUubG9nKCctIFBhcnNlZCBwcm9qZWN0IElEOicsIHBhcnNlZERlY3J5cHRlZC5wcm9qZWN0X2lkKTtcblxuICAgIC8vIFRlc3QgR29vZ2xlIEF1dGggY3JlYXRpb24gKHdpdGhvdXQgY2FsbGluZyBHb29nbGUpXG4gICAgY29uc29sZS5sb2coJ/CflJEgVGVzdGluZyBKV1QgY3JlYXRpb24uLi4nKTtcbiAgICBjb25zdCB7IEpXVCB9ID0gYXdhaXQgaW1wb3J0KCdnb29nbGUtYXV0aC1saWJyYXJ5Jyk7XG4gICAgXG4gICAgY29uc3Qgand0Q2xpZW50ID0gbmV3IEpXVCh7XG4gICAgICBlbWFpbDogcGFyc2VkRGVjcnlwdGVkLmNsaWVudF9lbWFpbCxcbiAgICAgIGtleTogcGFyc2VkRGVjcnlwdGVkLnByaXZhdGVfa2V5LFxuICAgICAgc2NvcGVzOiBbJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvaW5kZXhpbmcnXVxuICAgIH0pO1xuICAgIFxuICAgIGNvbnNvbGUubG9nKCfinIUgSldUIGNsaWVudCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScpO1xuXG4gICAgY29uc29sZS5sb2coJ+KchSBFbmNyeXB0aW9uIHRlc3QgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSAtIHJlYWR5IGZvciB1cGxvYWQgdmlhIFVJJyk7XG5cbiAgICByZXR1cm4gUmVzcG9uc2UuanNvbih7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgbWVzc2FnZTogJ1N1Y2Nlc3NmdWxseSBlbmNyeXB0ZWQgYW5kIHNhdmVkIHlvdXIgc2VydmljZSBhY2NvdW50IEpTT04nLFxuICAgICAgdGVzdF9yZXN1bHRzOiB7XG4gICAgICAgIG9yaWdpbmFsX2pzb25fbGVuZ3RoOiBqc29uU3RyaW5nLmxlbmd0aCxcbiAgICAgICAgZW5jcnlwdGVkX2xlbmd0aDogZW5jcnlwdGVkLmxlbmd0aCxcbiAgICAgICAgZGVjcnlwdGlvbl9zdWNjZXNzZnVsOiBkZWNyeXB0ZWQgPT09IGpzb25TdHJpbmcsXG4gICAgICAgIGp3dF9jcmVhdGlvbl9zdWNjZXNzZnVsOiB0cnVlLFxuICAgICAgICBkYXRhYmFzZV9zYXZlX3N1Y2Nlc3NmdWw6IHRydWVcbiAgICAgIH0sXG4gICAgICBzZXJ2aWNlX2FjY291bnQ6IHtcbiAgICAgICAgY2xpZW50X2VtYWlsOiBzZXJ2aWNlQWNjb3VudEpzb24uY2xpZW50X2VtYWlsLFxuICAgICAgICBwcm9qZWN0X2lkOiBzZXJ2aWNlQWNjb3VudEpzb24ucHJvamVjdF9pZCxcbiAgICAgICAgZW5jcnlwdGVkX3ByZXZpZXc6IGVuY3J5cHRlZC5zdWJzdHJpbmcoMCwgNTApICsgJy4uLidcbiAgICAgIH0sXG4gICAgICBuZXh0X3N0ZXA6ICdUZXN0IGluZGV4aW5nIGZ1bmN0aW9uYWxpdHkgLSBpdCBzaG91bGQgd29yayBub3chJ1xuICAgIH0pO1xuXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gdGVzdC1mcmVzaC1lbmNyeXB0OicsIGVycm9yKTtcbiAgICByZXR1cm4gUmVzcG9uc2UuanNvbih7IFxuICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gdGVzdCBlbmNyeXB0aW9uJyxcbiAgICAgIGRldGFpbHM6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXG4gICAgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgfVxufSJdLCJuYW1lcyI6WyJFbmNyeXB0aW9uU2VydmljZSIsIlBPU1QiLCJyZXF1ZXN0IiwiY29uc29sZSIsImxvZyIsInNlcnZpY2VBY2NvdW50SnNvbiIsInR5cGUiLCJwcm9qZWN0X2lkIiwiY2xpZW50X2VtYWlsIiwicHJpdmF0ZV9rZXlfaWQiLCJqc29uU3RyaW5nIiwiSlNPTiIsInN0cmluZ2lmeSIsImxlbmd0aCIsInN1YnN0cmluZyIsImVuY3J5cHRlZCIsImVuY3J5cHQiLCJkZWNyeXB0ZWQiLCJkZWNyeXB0IiwicGFyc2VkRGVjcnlwdGVkIiwicGFyc2UiLCJKV1QiLCJqd3RDbGllbnQiLCJlbWFpbCIsImtleSIsInByaXZhdGVfa2V5Iiwic2NvcGVzIiwiUmVzcG9uc2UiLCJqc29uIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJ0ZXN0X3Jlc3VsdHMiLCJvcmlnaW5hbF9qc29uX2xlbmd0aCIsImVuY3J5cHRlZF9sZW5ndGgiLCJkZWNyeXB0aW9uX3N1Y2Nlc3NmdWwiLCJqd3RfY3JlYXRpb25fc3VjY2Vzc2Z1bCIsImRhdGFiYXNlX3NhdmVfc3VjY2Vzc2Z1bCIsInNlcnZpY2VfYWNjb3VudCIsImVuY3J5cHRlZF9wcmV2aWV3IiwibmV4dF9zdGVwIiwiZXJyb3IiLCJkZXRhaWxzIiwiRXJyb3IiLCJzdGF0dXMiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/test-fresh-encrypt/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/encryption.ts":
/*!***************************!*\
  !*** ./lib/encryption.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   EncryptionService: () => (/* binding */ EncryptionService)\n/* harmony export */ });\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! crypto */ \"crypto\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);\n\n/**\n * Simple encryption utility for securing sensitive data\n * Uses AES-256-CBC with proper IV handling\n */ class EncryptionService {\n    static{\n        this.ALGORITHM = 'aes-256-cbc';\n    }\n    static{\n        this.IV_LENGTH = 16;\n    }\n    static getEncryptionKey() {\n        const key = process.env.ENCRYPTION_KEY;\n        if (!key) {\n            throw new Error('ENCRYPTION_KEY environment variable is required');\n        }\n        if (key.length !== 32) {\n            throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');\n        }\n        return Buffer.from(key, 'utf8');\n    }\n    /**\n   * Encrypt sensitive data\n   * Format: IV:EncryptedData\n   */ static encrypt(text) {\n        try {\n            const key = this.getEncryptionKey();\n            const iv = crypto__WEBPACK_IMPORTED_MODULE_0___default().randomBytes(this.IV_LENGTH);\n            const cipher = crypto__WEBPACK_IMPORTED_MODULE_0___default().createCipheriv(this.ALGORITHM, key, iv);\n            let encrypted = cipher.update(text, 'utf8', 'hex');\n            encrypted += cipher.final('hex');\n            return iv.toString('hex') + ':' + encrypted;\n        } catch (error) {\n            console.error('Encryption error:', error);\n            throw new Error('Failed to encrypt data');\n        }\n    }\n    /**\n   * Decrypt sensitive data\n   * Expects format: IV:EncryptedData\n   */ static decrypt(encryptedText) {\n        try {\n            console.log('🔓 DEBUG - Starting decryption process...');\n            console.log('- Input encrypted text length:', encryptedText.length);\n            console.log('- Input preview:', encryptedText.substring(0, 100) + '...');\n            const key = this.getEncryptionKey();\n            console.log('- Encryption key length:', key.length);\n            console.log('- Encryption key preview:', key.toString('hex').substring(0, 16) + '...');\n            const parts = encryptedText.split(':');\n            console.log('- Split parts count:', parts.length);\n            if (parts.length !== 2) {\n                console.error('❌ DEBUG - Invalid format, expected IV:EncryptedData but got', parts.length, 'parts');\n                throw new Error('Invalid encrypted data format - expected IV:EncryptedData');\n            }\n            console.log('- IV part (hex):', parts[0]);\n            console.log('- Encrypted data part length:', parts[1].length);\n            console.log('- Encrypted data preview:', parts[1].substring(0, 50) + '...');\n            const iv = Buffer.from(parts[0], 'hex');\n            console.log('- IV buffer length:', iv.length);\n            console.log('- IV buffer:', iv.toString('hex'));\n            const encryptedData = parts[1];\n            console.log('- Creating decipher with algorithm:', this.ALGORITHM);\n            const decipher = crypto__WEBPACK_IMPORTED_MODULE_0___default().createDecipheriv(this.ALGORITHM, key, iv);\n            console.log('- Updating decipher...');\n            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');\n            console.log('- First update result length:', decrypted.length);\n            console.log('- Finalizing decipher...');\n            decrypted += decipher.final('utf8');\n            console.log('- Final decrypted length:', decrypted.length);\n            console.log('- Decrypted preview:', decrypted.substring(0, 100) + '...');\n            return decrypted;\n        } catch (error) {\n            console.error('❌ Decryption error details:', error);\n            console.error('- Error name:', error instanceof Error ? error.name : 'Unknown');\n            console.error('- Error message:', error instanceof Error ? error.message : String(error));\n            console.error('- Error stack:', error instanceof Error ? error.stack : 'No stack');\n            throw new Error('Failed to decrypt data');\n        }\n    }\n    /**\n   * Test if encrypted data can be decrypted with current key\n   */ static testDecryption(encryptedText) {\n        try {\n            this.decrypt(encryptedText);\n            return true;\n        } catch (error) {\n            return false;\n        }\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LE1BQU07WUFFN0RjLFFBQVFHLEdBQUcsQ0FBQztZQUNaTyxhQUFhRixTQUFTWCxLQUFLLENBQUM7WUFDNUJHLFFBQVFHLEdBQUcsQ0FBQyw2QkFBNkJPLFVBQVV4QixNQUFNO1lBQ3pEYyxRQUFRRyxHQUFHLENBQUMsd0JBQXdCTyxVQUFVTixTQUFTLENBQUMsR0FBRyxPQUFPO1lBRWxFLE9BQU9NO1FBQ1QsRUFBRSxPQUFPWCxPQUFPO1lBQ2RDLFFBQVFELEtBQUssQ0FBQywrQkFBK0JBO1lBQzdDQyxRQUFRRCxLQUFLLENBQUMsaUJBQWlCQSxpQkFBaUJkLFFBQVFjLE1BQU1ZLElBQUksR0FBRztZQUNyRVgsUUFBUUQsS0FBSyxDQUFDLG9CQUFvQkEsaUJBQWlCZCxRQUFRYyxNQUFNYSxPQUFPLEdBQUdDLE9BQU9kO1lBQ2xGQyxRQUFRRCxLQUFLLENBQUMsa0JBQWtCQSxpQkFBaUJkLFFBQVFjLE1BQU1lLEtBQUssR0FBRztZQUN2RSxNQUFNLElBQUk3QixNQUFNO1FBQ2xCO0lBQ0Y7SUFFQTs7R0FFQyxHQUNELE9BQU84QixlQUFlYixhQUFxQixFQUFXO1FBQ3BELElBQUk7WUFDRixJQUFJLENBQUNELE9BQU8sQ0FBQ0M7WUFDYixPQUFPO1FBQ1QsRUFBRSxPQUFPSCxPQUFPO1lBQ2QsT0FBTztRQUNUO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9saWIvZW5jcnlwdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbi8qKlxuICogU2ltcGxlIGVuY3J5cHRpb24gdXRpbGl0eSBmb3Igc2VjdXJpbmcgc2Vuc2l0aXZlIGRhdGFcbiAqIFVzZXMgQUVTLTI1Ni1DQkMgd2l0aCBwcm9wZXIgSVYgaGFuZGxpbmdcbiAqL1xuZXhwb3J0IGNsYXNzIEVuY3J5cHRpb25TZXJ2aWNlIHtcbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgQUxHT1JJVEhNID0gJ2Flcy0yNTYtY2JjJztcbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgSVZfTEVOR1RIID0gMTY7XG4gIFxuICBwcml2YXRlIHN0YXRpYyBnZXRFbmNyeXB0aW9uS2V5KCk6IEJ1ZmZlciB7XG4gICAgY29uc3Qga2V5ID0gcHJvY2Vzcy5lbnYuRU5DUllQVElPTl9LRVk7XG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRU5DUllQVElPTl9LRVkgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG4gICAgaWYgKGtleS5sZW5ndGggIT09IDMyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VOQ1JZUFRJT05fS0VZIG11c3QgYmUgZXhhY3RseSAzMiBjaGFyYWN0ZXJzIGxvbmcnKTtcbiAgICB9XG4gICAgcmV0dXJuIEJ1ZmZlci5mcm9tKGtleSwgJ3V0ZjgnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbmNyeXB0IHNlbnNpdGl2ZSBkYXRhXG4gICAqIEZvcm1hdDogSVY6RW5jcnlwdGVkRGF0YVxuICAgKi9cbiAgc3RhdGljIGVuY3J5cHQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5nZXRFbmNyeXB0aW9uS2V5KCk7XG4gICAgICBjb25zdCBpdiA9IGNyeXB0by5yYW5kb21CeXRlcyh0aGlzLklWX0xFTkdUSCk7XG4gICAgICBjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYodGhpcy5BTEdPUklUSE0sIGtleSwgaXYpO1xuICAgICAgXG4gICAgICBsZXQgZW5jcnlwdGVkID0gY2lwaGVyLnVwZGF0ZSh0ZXh0LCAndXRmOCcsICdoZXgnKTtcbiAgICAgIGVuY3J5cHRlZCArPSBjaXBoZXIuZmluYWwoJ2hleCcpO1xuICAgICAgXG4gICAgICByZXR1cm4gaXYudG9TdHJpbmcoJ2hleCcpICsgJzonICsgZW5jcnlwdGVkO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFbmNyeXB0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGVuY3J5cHQgZGF0YScpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZWNyeXB0IHNlbnNpdGl2ZSBkYXRhXG4gICAqIEV4cGVjdHMgZm9ybWF0OiBJVjpFbmNyeXB0ZWREYXRhXG4gICAqL1xuICBzdGF0aWMgZGVjcnlwdChlbmNyeXB0ZWRUZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRyeSB7XG4gICAgICBjb25zb2xlLmxvZygn8J+UkyBERUJVRyAtIFN0YXJ0aW5nIGRlY3J5cHRpb24gcHJvY2Vzcy4uLicpO1xuICAgICAgY29uc29sZS5sb2coJy0gSW5wdXQgZW5jcnlwdGVkIHRleHQgbGVuZ3RoOicsIGVuY3J5cHRlZFRleHQubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUubG9nKCctIElucHV0IHByZXZpZXc6JywgZW5jcnlwdGVkVGV4dC5zdWJzdHJpbmcoMCwgMTAwKSArICcuLi4nKTtcbiAgICAgIFxuICAgICAgY29uc3Qga2V5ID0gdGhpcy5nZXRFbmNyeXB0aW9uS2V5KCk7XG4gICAgICBjb25zb2xlLmxvZygnLSBFbmNyeXB0aW9uIGtleSBsZW5ndGg6Jywga2V5Lmxlbmd0aCk7XG4gICAgICBjb25zb2xlLmxvZygnLSBFbmNyeXB0aW9uIGtleSBwcmV2aWV3OicsIGtleS50b1N0cmluZygnaGV4Jykuc3Vic3RyaW5nKDAsIDE2KSArICcuLi4nKTtcbiAgICAgIFxuICAgICAgY29uc3QgcGFydHMgPSBlbmNyeXB0ZWRUZXh0LnNwbGl0KCc6Jyk7XG4gICAgICBjb25zb2xlLmxvZygnLSBTcGxpdCBwYXJ0cyBjb3VudDonLCBwYXJ0cy5sZW5ndGgpO1xuICAgICAgXG4gICAgICBpZiAocGFydHMubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBERUJVRyAtIEludmFsaWQgZm9ybWF0LCBleHBlY3RlZCBJVjpFbmNyeXB0ZWREYXRhIGJ1dCBnb3QnLCBwYXJ0cy5sZW5ndGgsICdwYXJ0cycpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZW5jcnlwdGVkIGRhdGEgZm9ybWF0IC0gZXhwZWN0ZWQgSVY6RW5jcnlwdGVkRGF0YScpO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnLSBJViBwYXJ0IChoZXgpOicsIHBhcnRzWzBdKTtcbiAgICAgIGNvbnNvbGUubG9nKCctIEVuY3J5cHRlZCBkYXRhIHBhcnQgbGVuZ3RoOicsIHBhcnRzWzFdLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLmxvZygnLSBFbmNyeXB0ZWQgZGF0YSBwcmV2aWV3OicsIHBhcnRzWzFdLnN1YnN0cmluZygwLCA1MCkgKyAnLi4uJyk7XG4gICAgICBcbiAgICAgIGNvbnN0IGl2ID0gQnVmZmVyLmZyb20ocGFydHNbMF0sICdoZXgnKTtcbiAgICAgIGNvbnNvbGUubG9nKCctIElWIGJ1ZmZlciBsZW5ndGg6JywgaXYubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUubG9nKCctIElWIGJ1ZmZlcjonLCBpdi50b1N0cmluZygnaGV4JykpO1xuICAgICAgXG4gICAgICBjb25zdCBlbmNyeXB0ZWREYXRhID0gcGFydHNbMV07XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKCctIENyZWF0aW5nIGRlY2lwaGVyIHdpdGggYWxnb3JpdGhtOicsIHRoaXMuQUxHT1JJVEhNKTtcbiAgICAgIGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyaXYodGhpcy5BTEdPUklUSE0sIGtleSwgaXYpO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnLSBVcGRhdGluZyBkZWNpcGhlci4uLicpO1xuICAgICAgbGV0IGRlY3J5cHRlZCA9IGRlY2lwaGVyLnVwZGF0ZShlbmNyeXB0ZWREYXRhLCAnaGV4JywgJ3V0ZjgnKTtcbiAgICAgIGNvbnNvbGUubG9nKCctIEZpcnN0IHVwZGF0ZSByZXN1bHQgbGVuZ3RoOicsIGRlY3J5cHRlZC5sZW5ndGgpO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnLSBGaW5hbGl6aW5nIGRlY2lwaGVyLi4uJyk7XG4gICAgICBkZWNyeXB0ZWQgKz0gZGVjaXBoZXIuZmluYWwoJ3V0ZjgnKTtcbiAgICAgIGNvbnNvbGUubG9nKCctIEZpbmFsIGRlY3J5cHRlZCBsZW5ndGg6JywgZGVjcnlwdGVkLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLmxvZygnLSBEZWNyeXB0ZWQgcHJldmlldzonLCBkZWNyeXB0ZWQuc3Vic3RyaW5nKDAsIDEwMCkgKyAnLi4uJyk7XG4gICAgICBcbiAgICAgIHJldHVybiBkZWNyeXB0ZWQ7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBEZWNyeXB0aW9uIGVycm9yIGRldGFpbHM6JywgZXJyb3IpO1xuICAgICAgY29uc29sZS5lcnJvcignLSBFcnJvciBuYW1lOicsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5uYW1lIDogJ1Vua25vd24nKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJy0gRXJyb3IgbWVzc2FnZTonLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikpO1xuICAgICAgY29uc29sZS5lcnJvcignLSBFcnJvciBzdGFjazonLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiAnTm8gc3RhY2snKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGRlY3J5cHQgZGF0YScpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUZXN0IGlmIGVuY3J5cHRlZCBkYXRhIGNhbiBiZSBkZWNyeXB0ZWQgd2l0aCBjdXJyZW50IGtleVxuICAgKi9cbiAgc3RhdGljIHRlc3REZWNyeXB0aW9uKGVuY3J5cHRlZFRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmRlY3J5cHQoZW5jcnlwdGVkVGV4dCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufSJdLCJuYW1lcyI6WyJjcnlwdG8iLCJFbmNyeXB0aW9uU2VydmljZSIsIkFMR09SSVRITSIsIklWX0xFTkdUSCIsImdldEVuY3J5cHRpb25LZXkiLCJrZXkiLCJwcm9jZXNzIiwiZW52IiwiRU5DUllQVElPTl9LRVkiLCJFcnJvciIsImxlbmd0aCIsIkJ1ZmZlciIsImZyb20iLCJlbmNyeXB0IiwidGV4dCIsIml2IiwicmFuZG9tQnl0ZXMiLCJjaXBoZXIiLCJjcmVhdGVDaXBoZXJpdiIsImVuY3J5cHRlZCIsInVwZGF0ZSIsImZpbmFsIiwidG9TdHJpbmciLCJlcnJvciIsImNvbnNvbGUiLCJkZWNyeXB0IiwiZW5jcnlwdGVkVGV4dCIsImxvZyIsInN1YnN0cmluZyIsInBhcnRzIiwic3BsaXQiLCJlbmNyeXB0ZWREYXRhIiwiZGVjaXBoZXIiLCJjcmVhdGVEZWNpcGhlcml2IiwiZGVjcnlwdGVkIiwibmFtZSIsIm1lc3NhZ2UiLCJTdHJpbmciLCJzdGFjayIsInRlc3REZWNyeXB0aW9uIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/encryption.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-fresh-encrypt%2Froute&page=%2Fapi%2Ftest-fresh-encrypt%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-fresh-encrypt%2Froute.ts&appDir=%2Fhome%2Frunner%2Fworkspace%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Frunner%2Fworkspace&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-fresh-encrypt%2Froute&page=%2Fapi%2Ftest-fresh-encrypt%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-fresh-encrypt%2Froute.ts&appDir=%2Fhome%2Frunner%2Fworkspace%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Frunner%2Fworkspace&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   handler: () => (/* binding */ handler),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/dist/server/request-meta */ \"(rsc)/./node_modules/next/dist/server/request-meta.js\");\n/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next/dist/server/lib/trace/tracer */ \"(rsc)/./node_modules/next/dist/server/lib/trace/tracer.js\");\n/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! next/dist/shared/lib/router/utils/app-paths */ \"next/dist/shared/lib/router/utils/app-paths\");\n/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5__);\n/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! next/dist/server/base-http/node */ \"(rsc)/./node_modules/next/dist/server/base-http/node.js\");\n/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! next/dist/server/web/spec-extension/adapters/next-request */ \"(rsc)/./node_modules/next/dist/server/web/spec-extension/adapters/next-request.js\");\n/* harmony import */ var next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__);\n/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! next/dist/server/lib/trace/constants */ \"(rsc)/./node_modules/next/dist/server/lib/trace/constants.js\");\n/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__);\n/* harmony import */ var next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! next/dist/server/instrumentation/utils */ \"(rsc)/./node_modules/next/dist/server/instrumentation/utils.js\");\n/* harmony import */ var next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! next/dist/server/send-response */ \"(rsc)/./node_modules/next/dist/server/send-response.js\");\n/* harmony import */ var next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! next/dist/server/web/utils */ \"(rsc)/./node_modules/next/dist/server/web/utils.js\");\n/* harmony import */ var next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__);\n/* harmony import */ var next_dist_server_lib_cache_control__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! next/dist/server/lib/cache-control */ \"(rsc)/./node_modules/next/dist/server/lib/cache-control.js\");\n/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! next/dist/lib/constants */ \"(rsc)/./node_modules/next/dist/lib/constants.js\");\n/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__);\n/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! next/dist/shared/lib/no-fallback-error.external */ \"next/dist/shared/lib/no-fallback-error.external\");\n/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14__);\n/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! next/dist/server/response-cache */ \"(rsc)/./node_modules/next/dist/server/response-cache/index.js\");\n/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__);\n/* harmony import */ var _home_runner_workspace_app_api_test_fresh_encrypt_route_ts__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./app/api/test-fresh-encrypt/route.ts */ \"(rsc)/./app/api/test-fresh-encrypt/route.ts\");\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/test-fresh-encrypt/route\",\n        pathname: \"/api/test-fresh-encrypt\",\n        filename: \"route\",\n        bundlePath: \"app/api/test-fresh-encrypt/route\"\n    },\n    distDir: \".next\" || 0,\n    projectDir:  false || '',\n    resolvedPagePath: \"/home/runner/workspace/app/api/test-fresh-encrypt/route.ts\",\n    nextConfigOutput,\n    userland: _home_runner_workspace_app_api_test_fresh_encrypt_route_ts__WEBPACK_IMPORTED_MODULE_16__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\nasync function handler(req, res, ctx) {\n    var _nextConfig_experimental;\n    let srcPage = \"/api/test-fresh-encrypt/route\";\n    // turbopack doesn't normalize `/index` in the page name\n    // so we need to to process dynamic routes properly\n    // TODO: fix turbopack providing differing value from webpack\n    if (false) {} else if (srcPage === '/index') {\n        // we always normalize /index specifically\n        srcPage = '/';\n    }\n    const multiZoneDraftMode = \"false\";\n    const prepareResult = await routeModule.prepare(req, res, {\n        srcPage,\n        multiZoneDraftMode\n    });\n    if (!prepareResult) {\n        res.statusCode = 400;\n        res.end('Bad Request');\n        ctx.waitUntil == null ? void 0 : ctx.waitUntil.call(ctx, Promise.resolve());\n        return null;\n    }\n    const { buildId, params, nextConfig, isDraftMode, prerenderManifest, routerServerContext, isOnDemandRevalidate, revalidateOnlyGenerated, resolvedPathname } = prepareResult;\n    const normalizedSrcPage = (0,next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_5__.normalizeAppPath)(srcPage);\n    let isIsr = Boolean(prerenderManifest.dynamicRoutes[normalizedSrcPage] || prerenderManifest.routes[resolvedPathname]);\n    if (isIsr && !isDraftMode) {\n        const isPrerendered = Boolean(prerenderManifest.routes[resolvedPathname]);\n        const prerenderInfo = prerenderManifest.dynamicRoutes[normalizedSrcPage];\n        if (prerenderInfo) {\n            if (prerenderInfo.fallback === false && !isPrerendered) {\n                throw new next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_14__.NoFallbackError();\n            }\n        }\n    }\n    let cacheKey = null;\n    if (isIsr && !routeModule.isDev && !isDraftMode) {\n        cacheKey = resolvedPathname;\n        // ensure /index and / is normalized to one key\n        cacheKey = cacheKey === '/index' ? '/' : cacheKey;\n    }\n    const supportsDynamicResponse = // If we're in development, we always support dynamic HTML\n    routeModule.isDev === true || // If this is not SSG or does not have static paths, then it supports\n    // dynamic HTML.\n    !isIsr;\n    // This is a revalidation request if the request is for a static\n    // page and it is not being resumed from a postponed render and\n    // it is not a dynamic RSC request then it is a revalidation\n    // request.\n    const isRevalidate = isIsr && !supportsDynamicResponse;\n    const method = req.method || 'GET';\n    const tracer = (0,next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__.getTracer)();\n    const activeSpan = tracer.getActiveScopeSpan();\n    const context = {\n        params,\n        prerenderManifest,\n        renderOpts: {\n            experimental: {\n                dynamicIO: Boolean(nextConfig.experimental.dynamicIO),\n                authInterrupts: Boolean(nextConfig.experimental.authInterrupts)\n            },\n            supportsDynamicResponse,\n            incrementalCache: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'incrementalCache'),\n            cacheLifeProfiles: (_nextConfig_experimental = nextConfig.experimental) == null ? void 0 : _nextConfig_experimental.cacheLife,\n            isRevalidate,\n            waitUntil: ctx.waitUntil,\n            onClose: (cb)=>{\n                res.on('close', cb);\n            },\n            onAfterTaskError: undefined,\n            onInstrumentationRequestError: (error, _request, errorContext)=>routeModule.onRequestError(req, error, errorContext, routerServerContext)\n        },\n        sharedContext: {\n            buildId\n        }\n    };\n    const nodeNextReq = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__.NodeNextRequest(req);\n    const nodeNextRes = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_6__.NodeNextResponse(res);\n    const nextReq = next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__.NextRequestAdapter.fromNodeNextRequest(nodeNextReq, (0,next_dist_server_web_spec_extension_adapters_next_request__WEBPACK_IMPORTED_MODULE_7__.signalFromNodeResponse)(res));\n    try {\n        const invokeRouteModule = async (span)=>{\n            return routeModule.handle(nextReq, context).finally(()=>{\n                if (!span) return;\n                span.setAttributes({\n                    'http.status_code': res.statusCode,\n                    'next.rsc': false\n                });\n                const rootSpanAttributes = tracer.getRootSpanAttributes();\n                // We were unable to get attributes, probably OTEL is not enabled\n                if (!rootSpanAttributes) {\n                    return;\n                }\n                if (rootSpanAttributes.get('next.span_type') !== next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__.BaseServerSpan.handleRequest) {\n                    console.warn(`Unexpected root span type '${rootSpanAttributes.get('next.span_type')}'. Please report this Next.js issue https://github.com/vercel/next.js`);\n                    return;\n                }\n                const route = rootSpanAttributes.get('next.route');\n                if (route) {\n                    const name = `${method} ${route}`;\n                    span.setAttributes({\n                        'next.route': route,\n                        'http.route': route,\n                        'next.span_name': name\n                    });\n                    span.updateName(name);\n                } else {\n                    span.updateName(`${method} ${req.url}`);\n                }\n            });\n        };\n        const handleResponse = async (currentSpan)=>{\n            var _cacheEntry_value;\n            const responseGenerator = async ({ previousCacheEntry })=>{\n                try {\n                    if (!(0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'minimalMode') && isOnDemandRevalidate && revalidateOnlyGenerated && !previousCacheEntry) {\n                        res.statusCode = 404;\n                        // on-demand revalidate always sets this header\n                        res.setHeader('x-nextjs-cache', 'REVALIDATED');\n                        res.end('This page could not be found');\n                        return null;\n                    }\n                    const response = await invokeRouteModule(currentSpan);\n                    req.fetchMetrics = context.renderOpts.fetchMetrics;\n                    let pendingWaitUntil = context.renderOpts.pendingWaitUntil;\n                    // Attempt using provided waitUntil if available\n                    // if it's not we fallback to sendResponse's handling\n                    if (pendingWaitUntil) {\n                        if (ctx.waitUntil) {\n                            ctx.waitUntil(pendingWaitUntil);\n                            pendingWaitUntil = undefined;\n                        }\n                    }\n                    const cacheTags = context.renderOpts.collectedTags;\n                    // If the request is for a static response, we can cache it so long\n                    // as it's not edge.\n                    if (isIsr) {\n                        const blob = await response.blob();\n                        // Copy the headers from the response.\n                        const headers = (0,next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__.toNodeOutgoingHttpHeaders)(response.headers);\n                        if (cacheTags) {\n                            headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.NEXT_CACHE_TAGS_HEADER] = cacheTags;\n                        }\n                        if (!headers['content-type'] && blob.type) {\n                            headers['content-type'] = blob.type;\n                        }\n                        const revalidate = typeof context.renderOpts.collectedRevalidate === 'undefined' || context.renderOpts.collectedRevalidate >= next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.INFINITE_CACHE ? false : context.renderOpts.collectedRevalidate;\n                        const expire = typeof context.renderOpts.collectedExpire === 'undefined' || context.renderOpts.collectedExpire >= next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.INFINITE_CACHE ? undefined : context.renderOpts.collectedExpire;\n                        // Create the cache entry for the response.\n                        const cacheEntry = {\n                            value: {\n                                kind: next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__.CachedRouteKind.APP_ROUTE,\n                                status: response.status,\n                                body: Buffer.from(await blob.arrayBuffer()),\n                                headers\n                            },\n                            cacheControl: {\n                                revalidate,\n                                expire\n                            }\n                        };\n                        return cacheEntry;\n                    } else {\n                        // send response without caching if not ISR\n                        await (0,next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__.sendResponse)(nodeNextReq, nodeNextRes, response, context.renderOpts.pendingWaitUntil);\n                        return null;\n                    }\n                } catch (err) {\n                    // if this is a background revalidate we need to report\n                    // the request error here as it won't be bubbled\n                    if (previousCacheEntry == null ? void 0 : previousCacheEntry.isStale) {\n                        await routeModule.onRequestError(req, err, {\n                            routerKind: 'App Router',\n                            routePath: srcPage,\n                            routeType: 'route',\n                            revalidateReason: (0,next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_9__.getRevalidateReason)({\n                                isRevalidate,\n                                isOnDemandRevalidate\n                            })\n                        }, routerServerContext);\n                    }\n                    throw err;\n                }\n            };\n            const cacheEntry = await routeModule.handleResponse({\n                req,\n                nextConfig,\n                cacheKey,\n                routeKind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n                isFallback: false,\n                prerenderManifest,\n                isRoutePPREnabled: false,\n                isOnDemandRevalidate,\n                revalidateOnlyGenerated,\n                responseGenerator,\n                waitUntil: ctx.waitUntil\n            });\n            // we don't create a cacheEntry for ISR\n            if (!isIsr) {\n                return null;\n            }\n            if ((cacheEntry == null ? void 0 : (_cacheEntry_value = cacheEntry.value) == null ? void 0 : _cacheEntry_value.kind) !== next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_15__.CachedRouteKind.APP_ROUTE) {\n                var _cacheEntry_value1;\n                throw Object.defineProperty(new Error(`Invariant: app-route received invalid cache entry ${cacheEntry == null ? void 0 : (_cacheEntry_value1 = cacheEntry.value) == null ? void 0 : _cacheEntry_value1.kind}`), \"__NEXT_ERROR_CODE\", {\n                    value: \"E701\",\n                    enumerable: false,\n                    configurable: true\n                });\n            }\n            if (!(0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'minimalMode')) {\n                res.setHeader('x-nextjs-cache', isOnDemandRevalidate ? 'REVALIDATED' : cacheEntry.isMiss ? 'MISS' : cacheEntry.isStale ? 'STALE' : 'HIT');\n            }\n            // Draft mode should never be cached\n            if (isDraftMode) {\n                res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');\n            }\n            const headers = (0,next_dist_server_web_utils__WEBPACK_IMPORTED_MODULE_11__.fromNodeOutgoingHttpHeaders)(cacheEntry.value.headers);\n            if (!((0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_3__.getRequestMeta)(req, 'minimalMode') && isIsr)) {\n                headers.delete(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_13__.NEXT_CACHE_TAGS_HEADER);\n            }\n            // If cache control is already set on the response we don't\n            // override it to allow users to customize it via next.config\n            if (cacheEntry.cacheControl && !res.getHeader('Cache-Control') && !headers.get('Cache-Control')) {\n                headers.set('Cache-Control', (0,next_dist_server_lib_cache_control__WEBPACK_IMPORTED_MODULE_12__.getCacheControlHeader)(cacheEntry.cacheControl));\n            }\n            await (0,next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__.sendResponse)(nodeNextReq, nodeNextRes, new Response(cacheEntry.value.body, {\n                headers,\n                status: cacheEntry.value.status || 200\n            }));\n            return null;\n        };\n        // TODO: activeSpan code path is for when wrapped by\n        // next-server can be removed when this is no longer used\n        if (activeSpan) {\n            await handleResponse(activeSpan);\n        } else {\n            await tracer.withPropagatedContext(req.headers, ()=>tracer.trace(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_8__.BaseServerSpan.handleRequest, {\n                    spanName: `${method} ${req.url}`,\n                    kind: next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_4__.SpanKind.SERVER,\n                    attributes: {\n                        'http.method': method,\n                        'http.target': req.url\n                    }\n                }, handleResponse));\n        }\n    } catch (err) {\n        // if we aren't wrapped by base-server handle here\n        if (!activeSpan) {\n            await routeModule.onRequestError(req, err, {\n                routerKind: 'App Router',\n                routePath: normalizedSrcPage,\n                routeType: 'route',\n                revalidateReason: (0,next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_9__.getRevalidateReason)({\n                    isRevalidate,\n                    isOnDemandRevalidate\n                })\n            });\n        }\n        // rethrow so that we can handle serving error page\n        // If this is during static generation, throw the error again.\n        if (isIsr) throw err;\n        // Otherwise, send a 500 response.\n        await (0,next_dist_server_send_response__WEBPACK_IMPORTED_MODULE_10__.sendResponse)(nodeNextReq, nodeNextRes, new Response(null, {\n            status: 500\n        }));\n        return null;\n    }\n}\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZ0ZXN0LWZyZXNoLWVuY3J5cHQlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnRlc3QtZnJlc2gtZW5jcnlwdCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRnRlc3QtZnJlc2gtZW5jcnlwdCUyRnJvdXRlLnRzJmFwcERpcj0lMkZob21lJTJGcnVubmVyJTJGd29ya3NwYWNlJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZob21lJTJGcnVubmVyJTJGd29ya3NwYWNlJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEJmlzR2xvYmFsTm90Rm91bmRFbmFibGVkPSEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDZDtBQUNTO0FBQ087QUFDSztBQUNtQztBQUNqRDtBQUNPO0FBQ2Y7QUFDc0M7QUFDekI7QUFDTTtBQUNDO0FBQ2hCO0FBQ3FCO0FBQ3ZGO0FBQ0E7QUFDQTtBQUNBLHdCQUF3Qix5R0FBbUI7QUFDM0M7QUFDQSxjQUFjLGtFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLGFBQWEsT0FBb0MsSUFBSSxDQUFFO0FBQ3ZELGdCQUFnQixNQUF1QztBQUN2RDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFz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Q2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWLDZFQUE2RSxnRkFBYztBQUMzRixpQ0FBaUMsUUFBUSxFQUFFLFFBQVE7QUFDbkQsMEJBQTBCLHVFQUFRO0FBQ2xDO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtDQUFrQywyRkFBbUI7QUFDckQ7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGNBQWMsNkVBQVk7QUFDMUI7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBOztBQUVBIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0IHsgZ2V0UmVxdWVzdE1ldGEgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yZXF1ZXN0LW1ldGFcIjtcbmltcG9ydCB7IGdldFRyYWNlciwgU3BhbktpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvdHJhY2UvdHJhY2VyXCI7XG5pbXBvcnQgeyBub3JtYWxpemVBcHBQYXRoIH0gZnJvbSBcIm5leHQvZGlzdC9zaGFyZWQvbGliL3JvdXRlci91dGlscy9hcHAtcGF0aHNcIjtcbmltcG9ydCB7IE5vZGVOZXh0UmVxdWVzdCwgTm9kZU5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Jhc2UtaHR0cC9ub2RlXCI7XG5pbXBvcnQgeyBOZXh0UmVxdWVzdEFkYXB0ZXIsIHNpZ25hbEZyb21Ob2RlUmVzcG9uc2UgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci93ZWIvc3BlYy1leHRlbnNpb24vYWRhcHRlcnMvbmV4dC1yZXF1ZXN0XCI7XG5pbXBvcnQgeyBCYXNlU2VydmVyU3BhbiB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi90cmFjZS9jb25zdGFudHNcIjtcbmltcG9ydCB7IGdldFJldmFsaWRhdGVSZWFzb24gfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9pbnN0cnVtZW50YXRpb24vdXRpbHNcIjtcbmltcG9ydCB7IHNlbmRSZXNwb25zZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3NlbmQtcmVzcG9uc2VcIjtcbmltcG9ydCB7IGZyb21Ob2RlT3V0Z29pbmdIdHRwSGVhZGVycywgdG9Ob2RlT3V0Z29pbmdIdHRwSGVhZGVycyB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3dlYi91dGlsc1wiO1xuaW1wb3J0IHsgZ2V0Q2FjaGVDb250cm9sSGVhZGVyIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL2NhY2hlLWNvbnRyb2xcIjtcbmltcG9ydCB7IElORklOSVRFX0NBQ0hFLCBORVhUX0NBQ0hFX1RBR1NfSEVBREVSIH0gZnJvbSBcIm5leHQvZGlzdC9saWIvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBOb0ZhbGxiYWNrRXJyb3IgfSBmcm9tIFwibmV4dC9kaXN0L3NoYXJlZC9saWIvbm8tZmFsbGJhY2stZXJyb3IuZXh0ZXJuYWxcIjtcbmltcG9ydCB7IENhY2hlZFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3Jlc3BvbnNlLWNhY2hlXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9hcHAvYXBpL3Rlc3QtZnJlc2gtZW5jcnlwdC9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvdGVzdC1mcmVzaC1lbmNyeXB0L3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvdGVzdC1mcmVzaC1lbmNyeXB0XCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS90ZXN0LWZyZXNoLWVuY3J5cHQvcm91dGVcIlxuICAgIH0sXG4gICAgZGlzdERpcjogcHJvY2Vzcy5lbnYuX19ORVhUX1JFTEFUSVZFX0RJU1RfRElSIHx8ICcnLFxuICAgIHByb2plY3REaXI6IHByb2Nlc3MuZW52Ll9fTkVYVF9SRUxBVElWRV9QUk9KRUNUX0RJUiB8fCAnJyxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2UvYXBwL2FwaS90ZXN0LWZyZXNoLWVuY3J5cHQvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihyZXEsIHJlcywgY3R4KSB7XG4gICAgdmFyIF9uZXh0Q29uZmlnX2V4cGVyaW1lbnRhbDtcbiAgICBsZXQgc3JjUGFnZSA9IFwiL2FwaS90ZXN0LWZyZXNoLWVuY3J5cHQvcm91dGVcIjtcbiAgICAvLyB0dXJib3BhY2sgZG9lc24ndCBub3JtYWxpemUgYC9pbmRleGAgaW4gdGhlIHBhZ2UgbmFtZVxuICAgIC8vIHNvIHdlIG5lZWQgdG8gdG8gcHJvY2VzcyBkeW5hbWljIHJvdXRlcyBwcm9wZXJseVxuICAgIC8vIFRPRE86IGZpeCB0dXJib3BhY2sgcHJvdmlkaW5nIGRpZmZlcmluZyB2YWx1ZSBmcm9tIHdlYnBhY2tcbiAgICBpZiAocHJvY2Vzcy5lbnYuVFVSQk9QQUNLKSB7XG4gICAgICAgIHNyY1BhZ2UgPSBzcmNQYWdlLnJlcGxhY2UoL1xcL2luZGV4JC8sICcnKSB8fCAnLyc7XG4gICAgfSBlbHNlIGlmIChzcmNQYWdlID09PSAnL2luZGV4Jykge1xuICAgICAgICAvLyB3ZSBhbHdheXMgbm9ybWFsaXplIC9pbmRleCBzcGVjaWZpY2FsbHlcbiAgICAgICAgc3JjUGFnZSA9ICcvJztcbiAgICB9XG4gICAgY29uc3QgbXVsdGlab25lRHJhZnRNb2RlID0gcHJvY2Vzcy5lbnYuX19ORVhUX01VTFRJX1pPTkVfRFJBRlRfTU9ERTtcbiAgICBjb25zdCBwcmVwYXJlUmVzdWx0ID0gYXdhaXQgcm91dGVNb2R1bGUucHJlcGFyZShyZXEsIHJlcywge1xuICAgICAgICBzcmNQYWdlLFxuICAgICAgICBtdWx0aVpvbmVEcmFmdE1vZGVcbiAgICB9KTtcbiAgICBpZiAoIXByZXBhcmVSZXN1bHQpIHtcbiAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XG4gICAgICAgIHJlcy5lbmQoJ0JhZCBSZXF1ZXN0Jyk7XG4gICAgICAgIGN0eC53YWl0VW50aWwgPT0gbnVsbCA/IHZvaWQgMCA6IGN0eC53YWl0VW50aWwuY2FsbChjdHgsIFByb21pc2UucmVzb2x2ZSgpKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHsgYnVpbGRJZCwgcGFyYW1zLCBuZXh0Q29uZmlnLCBpc0RyYWZ0TW9kZSwgcHJlcmVuZGVyTWFuaWZlc3QsIHJvdXRlclNlcnZlckNvbnRleHQsIGlzT25EZW1hbmRSZXZhbGlkYXRlLCByZXZhbGlkYXRlT25seUdlbmVyYXRlZCwgcmVzb2x2ZWRQYXRobmFtZSB9ID0gcHJlcGFyZVJlc3VsdDtcbiAgICBjb25zdCBub3JtYWxpemVkU3JjUGFnZSA9IG5vcm1hbGl6ZUFwcFBhdGgoc3JjUGFnZSk7XG4gICAgbGV0IGlzSXNyID0gQm9vbGVhbihwcmVyZW5kZXJNYW5pZmVzdC5keW5hbWljUm91dGVzW25vcm1hbGl6ZWRTcmNQYWdlXSB8fCBwcmVyZW5kZXJNYW5pZmVzdC5yb3V0ZXNbcmVzb2x2ZWRQYXRobmFtZV0pO1xuICAgIGlmIChpc0lzciAmJiAhaXNEcmFmdE1vZGUpIHtcbiAgICAgICAgY29uc3QgaXNQcmVyZW5kZXJlZCA9IEJvb2xlYW4ocHJlcmVuZGVyTWFuaWZlc3Qucm91dGVzW3Jlc29sdmVkUGF0aG5hbWVdKTtcbiAgICAgICAgY29uc3QgcHJlcmVuZGVySW5mbyA9IHByZXJlbmRlck1hbmlmZXN0LmR5bmFtaWNSb3V0ZXNbbm9ybWFsaXplZFNyY1BhZ2VdO1xuICAgICAgICBpZiAocHJlcmVuZGVySW5mbykge1xuICAgICAgICAgICAgaWYgKHByZXJlbmRlckluZm8uZmFsbGJhY2sgPT09IGZhbHNlICYmICFpc1ByZXJlbmRlcmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IE5vRmFsbGJhY2tFcnJvcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGxldCBjYWNoZUtleSA9IG51bGw7XG4gICAgaWYgKGlzSXNyICYmICFyb3V0ZU1vZHVsZS5pc0RldiAmJiAhaXNEcmFmdE1vZGUpIHtcbiAgICAgICAgY2FjaGVLZXkgPSByZXNvbHZlZFBhdGhuYW1lO1xuICAgICAgICAvLyBlbnN1cmUgL2luZGV4IGFuZCAvIGlzIG5vcm1hbGl6ZWQgdG8gb25lIGtleVxuICAgICAgICBjYWNoZUtleSA9IGNhY2hlS2V5ID09PSAnL2luZGV4JyA/ICcvJyA6IGNhY2hlS2V5O1xuICAgIH1cbiAgICBjb25zdCBzdXBwb3J0c0R5bmFtaWNSZXNwb25zZSA9IC8vIElmIHdlJ3JlIGluIGRldmVsb3BtZW50LCB3ZSBhbHdheXMgc3VwcG9ydCBkeW5hbWljIEhUTUxcbiAgICByb3V0ZU1vZHVsZS5pc0RldiA9PT0gdHJ1ZSB8fCAvLyBJZiB0aGlzIGlzIG5vdCBTU0cgb3IgZG9lcyBub3QgaGF2ZSBzdGF0aWMgcGF0aHMsIHRoZW4gaXQgc3VwcG9ydHNcbiAgICAvLyBkeW5hbWljIEhUTUwuXG4gICAgIWlzSXNyO1xuICAgIC8vIFRoaXMgaXMgYSByZXZhbGlkYXRpb24gcmVxdWVzdCBpZiB0aGUgcmVxdWVzdCBpcyBmb3IgYSBzdGF0aWNcbiAgICAvLyBwYWdlIGFuZCBpdCBpcyBub3QgYmVpbmcgcmVzdW1lZCBmcm9tIGEgcG9zdHBvbmVkIHJlbmRlciBhbmRcbiAgICAvLyBpdCBpcyBub3QgYSBkeW5hbWljIFJTQyByZXF1ZXN0IHRoZW4gaXQgaXMgYSByZXZhbGlkYXRpb25cbiAgICAvLyByZXF1ZXN0LlxuICAgIGNvbnN0IGlzUmV2YWxpZGF0ZSA9IGlzSXNyICYmICFzdXBwb3J0c0R5bmFtaWNSZXNwb25zZTtcbiAgICBjb25zdCBtZXRob2QgPSByZXEubWV0aG9kIHx8ICdHRVQnO1xuICAgIGNvbnN0IHRyYWNlciA9IGdldFRyYWNlcigpO1xuICAgIGNvbnN0IGFjdGl2ZVNwYW4gPSB0cmFjZXIuZ2V0QWN0aXZlU2NvcGVTcGFuKCk7XG4gICAgY29uc3QgY29udGV4dCA9IHtcbiAgICAgICAgcGFyYW1zLFxuICAgICAgICBwcmVyZW5kZXJNYW5pZmVzdCxcbiAgICAgICAgcmVuZGVyT3B0czoge1xuICAgICAgICAgICAgZXhwZXJpbWVudGFsOiB7XG4gICAgICAgICAgICAgICAgZHluYW1pY0lPOiBCb29sZWFuKG5leHRDb25maWcuZXhwZXJpbWVudGFsLmR5bmFtaWNJTyksXG4gICAgICAgICAgICAgICAgYXV0aEludGVycnVwdHM6IEJvb2xlYW4obmV4dENvbmZpZy5leHBlcmltZW50YWwuYXV0aEludGVycnVwdHMpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VwcG9ydHNEeW5hbWljUmVzcG9uc2UsXG4gICAgICAgICAgICBpbmNyZW1lbnRhbENhY2hlOiBnZXRSZXF1ZXN0TWV0YShyZXEsICdpbmNyZW1lbnRhbENhY2hlJyksXG4gICAgICAgICAgICBjYWNoZUxpZmVQcm9maWxlczogKF9uZXh0Q29uZmlnX2V4cGVyaW1lbnRhbCA9IG5leHRDb25maWcuZXhwZXJpbWVudGFsKSA9PSBudWxsID8gdm9pZCAwIDogX25leHRDb25maWdfZXhwZXJpbWVudGFsLmNhY2hlTGlmZSxcbiAgICAgICAgICAgIGlzUmV2YWxpZGF0ZSxcbiAgICAgICAgICAgIHdhaXRVbnRpbDogY3R4LndhaXRVbnRpbCxcbiAgICAgICAgICAgIG9uQ2xvc2U6IChjYik9PntcbiAgICAgICAgICAgICAgICByZXMub24oJ2Nsb3NlJywgY2IpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQWZ0ZXJUYXNrRXJyb3I6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIG9uSW5zdHJ1bWVudGF0aW9uUmVxdWVzdEVycm9yOiAoZXJyb3IsIF9yZXF1ZXN0LCBlcnJvckNvbnRleHQpPT5yb3V0ZU1vZHVsZS5vblJlcXVlc3RFcnJvcihyZXEsIGVycm9yLCBlcnJvckNvbnRleHQsIHJvdXRlclNlcnZlckNvbnRleHQpXG4gICAgICAgIH0sXG4gICAgICAgIHNoYXJlZENvbnRleHQ6IHtcbiAgICAgICAgICAgIGJ1aWxkSWRcbiAgICAgICAgfVxuICAgIH07XG4gICAgY29uc3Qgbm9kZU5leHRSZXEgPSBuZXcgTm9kZU5leHRSZXF1ZXN0KHJlcSk7XG4gICAgY29uc3Qgbm9kZU5leHRSZXMgPSBuZXcgTm9kZU5leHRSZXNwb25zZShyZXMpO1xuICAgIGNvbnN0IG5leHRSZXEgPSBOZXh0UmVxdWVzdEFkYXB0ZXIuZnJvbU5vZGVOZXh0UmVxdWVzdChub2RlTmV4dFJlcSwgc2lnbmFsRnJvbU5vZGVSZXNwb25zZShyZXMpKTtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBpbnZva2VSb3V0ZU1vZHVsZSA9IGFzeW5jIChzcGFuKT0+e1xuICAgICAgICAgICAgcmV0dXJuIHJvdXRlTW9kdWxlLmhhbmRsZShuZXh0UmVxLCBjb250ZXh0KS5maW5hbGx5KCgpPT57XG4gICAgICAgICAgICAgICAgaWYgKCFzcGFuKSByZXR1cm47XG4gICAgICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGVzKHtcbiAgICAgICAgICAgICAgICAgICAgJ2h0dHAuc3RhdHVzX2NvZGUnOiByZXMuc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgICAgJ25leHQucnNjJzogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCByb290U3BhbkF0dHJpYnV0ZXMgPSB0cmFjZXIuZ2V0Um9vdFNwYW5BdHRyaWJ1dGVzKCk7XG4gICAgICAgICAgICAgICAgLy8gV2Ugd2VyZSB1bmFibGUgdG8gZ2V0IGF0dHJpYnV0ZXMsIHByb2JhYmx5IE9URUwgaXMgbm90IGVuYWJsZWRcbiAgICAgICAgICAgICAgICBpZiAoIXJvb3RTcGFuQXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyb290U3BhbkF0dHJpYnV0ZXMuZ2V0KCduZXh0LnNwYW5fdHlwZScpICE9PSBCYXNlU2VydmVyU3Bhbi5oYW5kbGVSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgVW5leHBlY3RlZCByb290IHNwYW4gdHlwZSAnJHtyb290U3BhbkF0dHJpYnV0ZXMuZ2V0KCduZXh0LnNwYW5fdHlwZScpfScuIFBsZWFzZSByZXBvcnQgdGhpcyBOZXh0LmpzIGlzc3VlIGh0dHBzOi8vZ2l0aHViLmNvbS92ZXJjZWwvbmV4dC5qc2ApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gcm9vdFNwYW5BdHRyaWJ1dGVzLmdldCgnbmV4dC5yb3V0ZScpO1xuICAgICAgICAgICAgICAgIGlmIChyb3V0ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYCR7bWV0aG9kfSAke3JvdXRlfWA7XG4gICAgICAgICAgICAgICAgICAgIHNwYW4uc2V0QXR0cmlidXRlcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICAnbmV4dC5yb3V0ZSc6IHJvdXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2h0dHAucm91dGUnOiByb3V0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICduZXh0LnNwYW5fbmFtZSc6IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNwYW4udXBkYXRlTmFtZShuYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzcGFuLnVwZGF0ZU5hbWUoYCR7bWV0aG9kfSAke3JlcS51cmx9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGhhbmRsZVJlc3BvbnNlID0gYXN5bmMgKGN1cnJlbnRTcGFuKT0+e1xuICAgICAgICAgICAgdmFyIF9jYWNoZUVudHJ5X3ZhbHVlO1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2VHZW5lcmF0b3IgPSBhc3luYyAoeyBwcmV2aW91c0NhY2hlRW50cnkgfSk9PntcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWdldFJlcXVlc3RNZXRhKHJlcSwgJ21pbmltYWxNb2RlJykgJiYgaXNPbkRlbWFuZFJldmFsaWRhdGUgJiYgcmV2YWxpZGF0ZU9ubHlHZW5lcmF0ZWQgJiYgIXByZXZpb3VzQ2FjaGVFbnRyeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvbi1kZW1hbmQgcmV2YWxpZGF0ZSBhbHdheXMgc2V0cyB0aGlzIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcigneC1uZXh0anMtY2FjaGUnLCAnUkVWQUxJREFURUQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoJ1RoaXMgcGFnZSBjb3VsZCBub3QgYmUgZm91bmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgaW52b2tlUm91dGVNb2R1bGUoY3VycmVudFNwYW4pO1xuICAgICAgICAgICAgICAgICAgICByZXEuZmV0Y2hNZXRyaWNzID0gY29udGV4dC5yZW5kZXJPcHRzLmZldGNoTWV0cmljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBlbmRpbmdXYWl0VW50aWwgPSBjb250ZXh0LnJlbmRlck9wdHMucGVuZGluZ1dhaXRVbnRpbDtcbiAgICAgICAgICAgICAgICAgICAgLy8gQXR0ZW1wdCB1c2luZyBwcm92aWRlZCB3YWl0VW50aWwgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIGl0J3Mgbm90IHdlIGZhbGxiYWNrIHRvIHNlbmRSZXNwb25zZSdzIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmIChwZW5kaW5nV2FpdFVudGlsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3R4LndhaXRVbnRpbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eC53YWl0VW50aWwocGVuZGluZ1dhaXRVbnRpbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVuZGluZ1dhaXRVbnRpbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYWNoZVRhZ3MgPSBjb250ZXh0LnJlbmRlck9wdHMuY29sbGVjdGVkVGFncztcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHJlcXVlc3QgaXMgZm9yIGEgc3RhdGljIHJlc3BvbnNlLCB3ZSBjYW4gY2FjaGUgaXQgc28gbG9uZ1xuICAgICAgICAgICAgICAgICAgICAvLyBhcyBpdCdzIG5vdCBlZGdlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNJc3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJsb2IgPSBhd2FpdCByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb3B5IHRoZSBoZWFkZXJzIGZyb20gdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IHRvTm9kZU91dGdvaW5nSHR0cEhlYWRlcnMocmVzcG9uc2UuaGVhZGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FjaGVUYWdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyc1tORVhUX0NBQ0hFX1RBR1NfSEVBREVSXSA9IGNhY2hlVGFncztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGVhZGVyc1snY29udGVudC10eXBlJ10gJiYgYmxvYi50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyc1snY29udGVudC10eXBlJ10gPSBibG9iLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXZhbGlkYXRlID0gdHlwZW9mIGNvbnRleHQucmVuZGVyT3B0cy5jb2xsZWN0ZWRSZXZhbGlkYXRlID09PSAndW5kZWZpbmVkJyB8fCBjb250ZXh0LnJlbmRlck9wdHMuY29sbGVjdGVkUmV2YWxpZGF0ZSA+PSBJTkZJTklURV9DQUNIRSA/IGZhbHNlIDogY29udGV4dC5yZW5kZXJPcHRzLmNvbGxlY3RlZFJldmFsaWRhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHBpcmUgPSB0eXBlb2YgY29udGV4dC5yZW5kZXJPcHRzLmNvbGxlY3RlZEV4cGlyZSA9PT0gJ3VuZGVmaW5lZCcgfHwgY29udGV4dC5yZW5kZXJPcHRzLmNvbGxlY3RlZEV4cGlyZSA+PSBJTkZJTklURV9DQUNIRSA/IHVuZGVmaW5lZCA6IGNvbnRleHQucmVuZGVyT3B0cy5jb2xsZWN0ZWRFeHBpcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGhlIGNhY2hlIGVudHJ5IGZvciB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYWNoZUVudHJ5ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IENhY2hlZFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OiBCdWZmZXIuZnJvbShhd2FpdCBibG9iLmFycmF5QnVmZmVyKCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZUNvbnRyb2w6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV2YWxpZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwaXJlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZUVudHJ5O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VuZCByZXNwb25zZSB3aXRob3V0IGNhY2hpbmcgaWYgbm90IElTUlxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2VuZFJlc3BvbnNlKG5vZGVOZXh0UmVxLCBub2RlTmV4dFJlcywgcmVzcG9uc2UsIGNvbnRleHQucmVuZGVyT3B0cy5wZW5kaW5nV2FpdFVudGlsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgYSBiYWNrZ3JvdW5kIHJldmFsaWRhdGUgd2UgbmVlZCB0byByZXBvcnRcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHJlcXVlc3QgZXJyb3IgaGVyZSBhcyBpdCB3b24ndCBiZSBidWJibGVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c0NhY2hlRW50cnkgPT0gbnVsbCA/IHZvaWQgMCA6IHByZXZpb3VzQ2FjaGVFbnRyeS5pc1N0YWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCByb3V0ZU1vZHVsZS5vblJlcXVlc3RFcnJvcihyZXEsIGVyciwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlcktpbmQ6ICdBcHAgUm91dGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZVBhdGg6IHNyY1BhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGVUeXBlOiAncm91dGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldmFsaWRhdGVSZWFzb246IGdldFJldmFsaWRhdGVSZWFzb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1JldmFsaWRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzT25EZW1hbmRSZXZhbGlkYXRlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIHJvdXRlclNlcnZlckNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgY2FjaGVFbnRyeSA9IGF3YWl0IHJvdXRlTW9kdWxlLmhhbmRsZVJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICByZXEsXG4gICAgICAgICAgICAgICAgbmV4dENvbmZpZyxcbiAgICAgICAgICAgICAgICBjYWNoZUtleSxcbiAgICAgICAgICAgICAgICByb3V0ZUtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgICAgICAgICAgaXNGYWxsYmFjazogZmFsc2UsXG4gICAgICAgICAgICAgICAgcHJlcmVuZGVyTWFuaWZlc3QsXG4gICAgICAgICAgICAgICAgaXNSb3V0ZVBQUkVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGlzT25EZW1hbmRSZXZhbGlkYXRlLFxuICAgICAgICAgICAgICAgIHJldmFsaWRhdGVPbmx5R2VuZXJhdGVkLFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlR2VuZXJhdG9yLFxuICAgICAgICAgICAgICAgIHdhaXRVbnRpbDogY3R4LndhaXRVbnRpbFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyB3ZSBkb24ndCBjcmVhdGUgYSBjYWNoZUVudHJ5IGZvciBJU1JcbiAgICAgICAgICAgIGlmICghaXNJc3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgoY2FjaGVFbnRyeSA9PSBudWxsID8gdm9pZCAwIDogKF9jYWNoZUVudHJ5X3ZhbHVlID0gY2FjaGVFbnRyeS52YWx1ZSkgPT0gbnVsbCA/IHZvaWQgMCA6IF9jYWNoZUVudHJ5X3ZhbHVlLmtpbmQpICE9PSBDYWNoZWRSb3V0ZUtpbmQuQVBQX1JPVVRFKSB7XG4gICAgICAgICAgICAgICAgdmFyIF9jYWNoZUVudHJ5X3ZhbHVlMTtcbiAgICAgICAgICAgICAgICB0aHJvdyBPYmplY3QuZGVmaW5lUHJvcGVydHkobmV3IEVycm9yKGBJbnZhcmlhbnQ6IGFwcC1yb3V0ZSByZWNlaXZlZCBpbnZhbGlkIGNhY2hlIGVudHJ5ICR7Y2FjaGVFbnRyeSA9PSBudWxsID8gdm9pZCAwIDogKF9jYWNoZUVudHJ5X3ZhbHVlMSA9IGNhY2hlRW50cnkudmFsdWUpID09IG51bGwgPyB2b2lkIDAgOiBfY2FjaGVFbnRyeV92YWx1ZTEua2luZH1gKSwgXCJfX05FWFRfRVJST1JfQ09ERVwiLCB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBcIkU3MDFcIixcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFnZXRSZXF1ZXN0TWV0YShyZXEsICdtaW5pbWFsTW9kZScpKSB7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcigneC1uZXh0anMtY2FjaGUnLCBpc09uRGVtYW5kUmV2YWxpZGF0ZSA/ICdSRVZBTElEQVRFRCcgOiBjYWNoZUVudHJ5LmlzTWlzcyA/ICdNSVNTJyA6IGNhY2hlRW50cnkuaXNTdGFsZSA/ICdTVEFMRScgOiAnSElUJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBEcmFmdCBtb2RlIHNob3VsZCBuZXZlciBiZSBjYWNoZWRcbiAgICAgICAgICAgIGlmIChpc0RyYWZ0TW9kZSkge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAncHJpdmF0ZSwgbm8tY2FjaGUsIG5vLXN0b3JlLCBtYXgtYWdlPTAsIG11c3QtcmV2YWxpZGF0ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgaGVhZGVycyA9IGZyb21Ob2RlT3V0Z29pbmdIdHRwSGVhZGVycyhjYWNoZUVudHJ5LnZhbHVlLmhlYWRlcnMpO1xuICAgICAgICAgICAgaWYgKCEoZ2V0UmVxdWVzdE1ldGEocmVxLCAnbWluaW1hbE1vZGUnKSAmJiBpc0lzcikpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLmRlbGV0ZShORVhUX0NBQ0hFX1RBR1NfSEVBREVSKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIGNhY2hlIGNvbnRyb2wgaXMgYWxyZWFkeSBzZXQgb24gdGhlIHJlc3BvbnNlIHdlIGRvbid0XG4gICAgICAgICAgICAvLyBvdmVycmlkZSBpdCB0byBhbGxvdyB1c2VycyB0byBjdXN0b21pemUgaXQgdmlhIG5leHQuY29uZmlnXG4gICAgICAgICAgICBpZiAoY2FjaGVFbnRyeS5jYWNoZUNvbnRyb2wgJiYgIXJlcy5nZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnKSAmJiAhaGVhZGVycy5nZXQoJ0NhY2hlLUNvbnRyb2wnKSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDYWNoZS1Db250cm9sJywgZ2V0Q2FjaGVDb250cm9sSGVhZGVyKGNhY2hlRW50cnkuY2FjaGVDb250cm9sKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCBzZW5kUmVzcG9uc2Uobm9kZU5leHRSZXEsIG5vZGVOZXh0UmVzLCBuZXcgUmVzcG9uc2UoY2FjaGVFbnRyeS52YWx1ZS5ib2R5LCB7XG4gICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICBzdGF0dXM6IGNhY2hlRW50cnkudmFsdWUuc3RhdHVzIHx8IDIwMFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG4gICAgICAgIC8vIFRPRE86IGFjdGl2ZVNwYW4gY29kZSBwYXRoIGlzIGZvciB3aGVuIHdyYXBwZWQgYnlcbiAgICAgICAgLy8gbmV4dC1zZXJ2ZXIgY2FuIGJlIHJlbW92ZWQgd2hlbiB0aGlzIGlzIG5vIGxvbmdlciB1c2VkXG4gICAgICAgIGlmIChhY3RpdmVTcGFuKSB7XG4gICAgICAgICAgICBhd2FpdCBoYW5kbGVSZXNwb25zZShhY3RpdmVTcGFuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IHRyYWNlci53aXRoUHJvcGFnYXRlZENvbnRleHQocmVxLmhlYWRlcnMsICgpPT50cmFjZXIudHJhY2UoQmFzZVNlcnZlclNwYW4uaGFuZGxlUmVxdWVzdCwge1xuICAgICAgICAgICAgICAgICAgICBzcGFuTmFtZTogYCR7bWV0aG9kfSAke3JlcS51cmx9YCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogU3BhbktpbmQuU0VSVkVSLFxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAnaHR0cC5tZXRob2QnOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAnaHR0cC50YXJnZXQnOiByZXEudXJsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBoYW5kbGVSZXNwb25zZSkpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIGlmIHdlIGFyZW4ndCB3cmFwcGVkIGJ5IGJhc2Utc2VydmVyIGhhbmRsZSBoZXJlXG4gICAgICAgIGlmICghYWN0aXZlU3Bhbikge1xuICAgICAgICAgICAgYXdhaXQgcm91dGVNb2R1bGUub25SZXF1ZXN0RXJyb3IocmVxLCBlcnIsIHtcbiAgICAgICAgICAgICAgICByb3V0ZXJLaW5kOiAnQXBwIFJvdXRlcicsXG4gICAgICAgICAgICAgICAgcm91dGVQYXRoOiBub3JtYWxpemVkU3JjUGFnZSxcbiAgICAgICAgICAgICAgICByb3V0ZVR5cGU6ICdyb3V0ZScsXG4gICAgICAgICAgICAgICAgcmV2YWxpZGF0ZVJlYXNvbjogZ2V0UmV2YWxpZGF0ZVJlYXNvbih7XG4gICAgICAgICAgICAgICAgICAgIGlzUmV2YWxpZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgaXNPbkRlbWFuZFJldmFsaWRhdGVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmV0aHJvdyBzbyB0aGF0IHdlIGNhbiBoYW5kbGUgc2VydmluZyBlcnJvciBwYWdlXG4gICAgICAgIC8vIElmIHRoaXMgaXMgZHVyaW5nIHN0YXRpYyBnZW5lcmF0aW9uLCB0aHJvdyB0aGUgZXJyb3IgYWdhaW4uXG4gICAgICAgIGlmIChpc0lzcikgdGhyb3cgZXJyO1xuICAgICAgICAvLyBPdGhlcndpc2UsIHNlbmQgYSA1MDAgcmVzcG9uc2UuXG4gICAgICAgIGF3YWl0IHNlbmRSZXNwb25zZShub2RlTmV4dFJlcSwgbm9kZU5leHRSZXMsIG5ldyBSZXNwb25zZShudWxsLCB7XG4gICAgICAgICAgICBzdGF0dXM6IDUwMFxuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-fresh-encrypt%2Froute&page=%2Fapi%2Ftest-fresh-encrypt%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-fresh-encrypt%2Froute.ts&appDir=%2Fhome%2Frunner%2Fworkspace%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Frunner%2Fworkspace&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "./work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "next/dist/shared/lib/no-fallback-error.external":
/*!******************************************************************!*\
  !*** external "next/dist/shared/lib/no-fallback-error.external" ***!
  \******************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/no-fallback-error.external");

/***/ }),

/***/ "next/dist/shared/lib/router/utils/app-paths":
/*!**************************************************************!*\
  !*** external "next/dist/shared/lib/router/utils/app-paths" ***!
  \**************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/router/utils/app-paths");

/***/ }),

/***/ "node:buffer":
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:http":
/*!****************************!*\
  !*** external "node:http" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ "node:https":
/*!*****************************!*\
  !*** external "node:https" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:https");

/***/ }),

/***/ "node:net":
/*!***************************!*\
  !*** external "node:net" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ "node:stream":
/*!******************************!*\
  !*** external "node:stream" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ "node:stream/web":
/*!**********************************!*\
  !*** external "node:stream/web" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/web");

/***/ }),

/***/ "node:url":
/*!***************************!*\
  !*** external "node:url" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ "node:zlib":
/*!****************************!*\
  !*** external "node:zlib" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-fresh-encrypt%2Froute&page=%2Fapi%2Ftest-fresh-encrypt%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-fresh-encrypt%2Froute.ts&appDir=%2Fhome%2Frunner%2Fworkspace%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Frunner%2Fworkspace&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=!")));
module.exports = __webpack_exports__;

})();