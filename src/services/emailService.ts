import emailjs from '@emailjs/browser';

// Initialize EmailJS with the Public Key
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'Xr6kSMDXLy1Dr35Y8';
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_fnnt0pl';
const FEEDBACK_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_FEEDBACK_TEMPLATE_ID || 'template_s44ffk5';
const PURCHASE_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_PURCHASE_TEMPLATE_ID || 'template_pox74wq';

emailjs.init(PUBLIC_KEY);

export interface FeedbackData {
  from_name: string;
  from_email: string;
  message: string;
}

export interface PurchaseData {
  student_name: string;
  exam_name: string;
  method: string;
  amount: number;
  trxid: string;
}

/**
 * Sends student feedback via EmailJS
 */
export const sendFeedback = async (data: FeedbackData) => {
  try {
    // Basic validation
    if (!data.from_name || !data.from_email || !data.message) {
      throw new Error('All feedback fields are required.');
    }

    const response = await emailjs.send(SERVICE_ID, FEEDBACK_TEMPLATE_ID, {
      from_name: data.from_name,
      from_email: data.from_email,
      message: data.message,
    });

    return response;
  } catch (error) {
    console.error('EmailJS Feedback Error:', error);
    throw error;
  }
};

/**
 * Sends exam purchase notification via EmailJS
 */
export const sendPurchaseRequest = async (data: PurchaseData) => {
  try {
    // Basic validation
    if (!data.student_name || !data.exam_name || !data.trxid) {
      throw new Error('Student name, exam name, and Transaction ID are required.');
    }

    const response = await emailjs.send(SERVICE_ID, PURCHASE_TEMPLATE_ID, {
      student_name: data.student_name,
      exam_name: data.exam_name,
      method: data.method,
      amount: data.amount,
      trxid: data.trxid,
    });

    return response;
  } catch (error) {
    console.error('EmailJS Purchase Error:', error);
    throw error;
  }
};
