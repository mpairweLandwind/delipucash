import axios from 'axios';
import prisma from '../lib/prisma.mjs';
import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';

// Helper function to generate MTN API token
const getMtnToken = async () => {
  const userId = process.env.MTN_USER_ID;
  const apiKey = process.env.MTN_API_KEY;
  const subscriptionKey = process.env.MTN_PRIMARY_KEY;

  if (!userId || !apiKey || !subscriptionKey) {
    throw new Error('Missing required MTN API credentials');
  }

  try {
    const credentials = Buffer.from(`${userId}:${apiKey}`).toString('base64');
    const response = await axios.post(
      'https://sandbox.momodeveloper.mtn.com/collection/token/',
      {},
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      }
    );

    const { access_token, expires_in } = response.data;
    console.log(`MTN Token acquired: ${access_token.substring(0, 50)}...`);
    console.log(`Token expires in: ${expires_in} seconds`);

    return access_token;
  } catch (error) {
    console.error('Error fetching MTN token:', error.response?.data || error.message);
    throw new Error('Failed to get MTN API token');
  }
};

// Helper function to generate Airtel API token
const getAirtelToken = async () => {
  try {
    const response = await axios.post(
      'https://openapiuat.airtel.africa/auth/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AIRTEL_CLIENT_ID,
        client_secret: process.env.AIRTEL_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    console.log('Airtel Token Response:', response.data);
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching Airtel token:', error.response?.data || error.message);
    throw new Error('Failed to get Airtel API token');
  }
};

// Helper function to check payment status and save to database
const checkPaymentStatusAndSave = async (referenceId, provider, token, phoneNumber, amount, subscriptionType, userId) => {
  let statusResponse;

  if (provider === 'MTN') {
    statusResponse = await axios.get(
      `https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X_TARGET_ENVIRONMENT': 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_PRIMARY_KEY,
        },
      }
    );
  } else if (provider === 'AIRTEL') {
    statusResponse = await axios.get(
      `https://openapi.airtel.africa/standard/v1/payments/${referenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
      }
    );
  }

  const paymentStatus = statusResponse.data.status || statusResponse.data.data.status;

  if (paymentStatus === 'SUCCESSFUL') {
    const transactionId = provider === 'MTN'
      ? statusResponse.data.financialTransactionId // MTN transaction ID
      : statusResponse.data.transaction.id; // Airtel transaction ID

    if (!transactionId) {
      throw new Error('Transaction ID not found in the payment response');
    }

    // Calculate startDate and endDate
    const startDate = new Date(); // Current timestamp
    const endDate = new Date(startDate);

    if (subscriptionType === 'WEEKLY') {
      endDate.setDate(startDate.getDate() + 7); // Add 7 days for WEEKLY
    } else if (subscriptionType === 'MONTHLY') {
      endDate.setMonth(startDate.getMonth() + 1); // Add 1 month for MONTHLY
    } else {
      throw new Error('Invalid subscriptionType');
    }

    const payment = await prisma.payment.create({
      data: {
        phoneNumber,
        amount,
        status: paymentStatus,
        provider,
        TransactionId: transactionId,
        subscriptionType,
        startDate, // Include startDate
        endDate,   // Include endDate
        userId,    // Include userId
      },
    });
    console.log('Payment saved to database:', payment);
    return payment;
  } else {
    console.log('Payment failed with status:', paymentStatus);
    throw new Error(`Payment failed with status: ${paymentStatus}`);
  }
};

// Initiate Payment
export const initiatePayment = asyncHandler(async (req, res) => {
  console.log('Incoming request: POST /api/payments/initiate');
  console.log('Token:', req.headers.authorization);
  console.log('Received Payment Initiation Request:', req.body);

  const { amount, phoneNumber, provider, subscriptionType, userId } = req.body;

  // Validate required fields
  if (!amount || !phoneNumber || !provider || !subscriptionType || !userId) {
    throw new Error('Missing required fields in the request body');
  }

  try {
    let paymentResponse;
    const referenceId = uuidv4();

    if (provider === 'MTN') {
      const token = await getMtnToken();

      paymentResponse = await axios.post(
        'https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay',
        {
          amount: amount,
          currency: 'EUR',
          externalId: referenceId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber,
          },
          payerMessage: 'Payment for service',
          payeeNote: 'Thank you for your payment',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': process.env.MTN_PRIMARY_KEY,
          },
        }
      );

      console.log('MTN RequestToPay API Response:', paymentResponse.data);

      // Wait for a short period to allow the payment to be processed
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check payment status and save to database
      const payment = await checkPaymentStatusAndSave(referenceId, provider, token, phoneNumber, amount, subscriptionType, userId);
      res.status(200).json({ message: 'Payment initiated and saved successfully', payment });
    } else if (provider === 'AIRTEL') {
      const token = await getAirtelToken();

      paymentResponse = await axios.post(
        'https://openapi.airtel.africa/merchant/v1/payments/',
        {
          reference: referenceId,
          subscriber: {
            country: 'UG',
            currency: 'UGX',
            msisdn: phoneNumber,
          },
          transaction: {
            amount: amount,
            country: 'UG',
            currency: 'UGX',
            id: referenceId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Country': 'UG',
            'X-Currency': 'UGX',
          },
        }
      );

      console.log('Airtel Payment Response:', paymentResponse.data);

      // Check payment status and save to database
      const payment = await checkPaymentStatusAndSave(referenceId, provider, token, phoneNumber, amount, subscriptionType, userId);
      res.status(200).json({ message: 'Payment initiated and saved successfully', payment });
    } else {
      throw new Error('Invalid payment provider');
    }
  } catch (error) {
    console.error('Error initiating payment:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to initiate payment', error: error.response?.data || error.message });
  }
});
// Handle Callback
export const handleCallback = asyncHandler(async (req, res) => {
  const { transactionId, status, provider } = req.body;
  console.log('Received Callback:', req.body);

  // Update payment status in database
  const payment = await prisma.payment.update({
    where: { id: transactionId },
    data: { status },
  });

  res.status(200).json({ message: 'Callback handled', payment });
});

export const getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Received Payment History Request:', req.params);

    const payments = await prisma.payment.find({ userId }).sort({ createdAt: -1 });

    return res.json({ payments });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Update Payment Status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;
    console.log('Received Update Payment Status Request:', req.params, req.body);

    if (!["PENDING", "SUCCESS", "FAILED"].includes(status)) {
      return res.status(400).json({ message: "Invalid payment status." });
    }

    const updatedPayment = await prisma.payment.findByIdAndUpdate(
      paymentId,
      { status },
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    return res.json({
      message: `Payment status updated to ${status}!`,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
