import emailjs from "@emailjs/browser";

export const sendWelcomeEmail = async (email: string) => {
  try {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_5o4a2wy";
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_c34xhj9";
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "6to7rHK8KJtzHVXbK";

    if (!serviceId || !templateId || !publicKey) {
      throw new Error("EmailJS configuration is missing. Please check your environment variables.");
    }

    console.log("📧 Attempting to send welcome email to:", email);
    console.log("📋 Using template ID:", templateId);
    
    const response = await emailjs.send(
      serviceId,
      templateId,
      { email: email },
      {
        publicKey: publicKey
      }
    );
    
    console.log("✅ LockerLink welcome email sent successfully to", email);
    console.log("📬 EmailJS response:", response);
    return { success: true, response };
  } catch (err: any) {
    // Better error logging
    const errorMessage = err?.text || err?.message || JSON.stringify(err) || "Unknown error";
    const errorStatus = err?.status || "N/A";
    
    console.error("❌ Failed to send welcome email");
    console.error("Error status:", errorStatus);
    console.error("Error message:", errorMessage);
    console.error("Full error object:", err);
    
    // Log specific error properties if they exist
    if (err?.response) {
      console.error("Error response:", err.response);
    }
    if (err?.text) {
      console.error("Error text:", err.text);
    }
    
    return { success: false, error: { status: errorStatus, message: errorMessage, fullError: err } };
  }
};

