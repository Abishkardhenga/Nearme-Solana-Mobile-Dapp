import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export {registerMerchant} from "./registerMerchant";
export {getNearbyMerchants} from "./getNearbyMerchants";
export {createPaymentRequest, fulfillPaymentRequest, expirePaymentRequests} from "./paymentFunctions";
