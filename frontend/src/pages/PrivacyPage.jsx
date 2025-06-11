import React from 'react';
import { Link } from 'react-router-dom';

const PRIVACY_CONTENT = {
  title: "Privacy Policy",
  lastUpdated: new Date().toLocaleDateString(),
  sections: [
    {
      title: "1. Information We Collect",
      content: "We collect information to provide better services to our users. The types of information we collect include:",
      type: "list",
      items: [
        "Account information (email, password, profile details)",
        "Usage data (trails viewed, uploads, interactions)",
        "Location data (when you choose to share your hiking locations)",
        "Device information (browser type, IP address, device type)",
        "Cookies and similar technologies"
      ]
    },
    {
      title: "2. How We Use Your Information",
      content: "We use the collected information for various purposes:",
      type: "list",
      items: [
        "To provide and maintain our service",
        "To notify you about changes to our service",
        "To provide customer support",
        "To gather analysis or valuable information to improve our service",
        "To monitor the usage of our service",
        "To detect, prevent and address technical issues"
      ]
    },
    {
      title: "3. Data Storage and Security",
      content: "We implement appropriate security measures to protect your personal information:",
      type: "list",
      items: [
        "All data is encrypted during transmission",
        "Secure servers with regular security updates",
        "Limited access to personal information",
        "Regular security assessments and audits",
        "Backup systems to prevent data loss"
      ]
    },
    {
      title: "4. Data Sharing and Disclosure",
      content: "We may share your information in the following circumstances:",
      type: "list",
      items: [
        "With your consent",
        "To comply with legal obligations",
        "To protect and defend our rights and property",
        "To prevent or investigate possible wrongdoing",
        "To protect the personal safety of users or the public"
      ]
    },
    {
      title: "5. Your Rights",
      content: "You have certain rights regarding your personal information:",
      type: "list",
      items: [
        "Access your personal information",
        "Correct inaccurate data",
        "Request deletion of your data",
        "Object to processing of your data",
        "Data portability",
        "Withdraw consent"
      ]
    },
    {
      title: "6. Cookies and Tracking",
      content: "We use cookies and similar tracking technologies to track activity on our service:",
      type: "list",
      items: [
        "Essential cookies for basic functionality",
        "Preference cookies to remember your settings",
        "Analytics cookies to understand how you use our service",
        "Marketing cookies to deliver relevant advertisements"
      ]
    },
    {
      title: "7. Children's Privacy",
      content: "Our service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.",
      type: "paragraph"
    },
    {
      title: "8. Changes to This Policy",
      content: "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last updated' date.",
      type: "paragraph"
    },
    {
      title: "9. Contact Us",
      content: "If you have any questions about this Privacy Policy, please contact us at:",
      type: "contact",
      email: "privacy@hikingtrails.com"
    }
  ]
};

function PrivacyPage() {
  const renderSection = (section) => {
    return (
      <section key={section.title} className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">{section.title}</h2>
        <p className="text-gray-600 mb-4">{section.content}</p>
        
        {section.type === "list" && (
          <ul className="list-disc pl-6 text-gray-600 mb-4">
            {section.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}

        {section.type === "contact" && (
          <p className="text-gray-600">{section.email}</p>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">{PRIVACY_CONTENT.title}</h1>
          <p className="mt-2 text-gray-600">Last updated: {PRIVACY_CONTENT.lastUpdated}</p>
        </div>

        <div className="prose prose-green max-w-none">
          {PRIVACY_CONTENT.sections.map(renderSection)}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage; 