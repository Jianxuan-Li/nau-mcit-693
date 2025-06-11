import React from 'react';
import { Link } from 'react-router-dom';

const TERMS_CONTENT = {
  title: "Terms of Service",
  lastUpdated: new Date().toLocaleDateString(),
  sections: [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing and using Hiking Trails, you accept and agree to be bound by the terms and provision of this agreement.",
      type: "paragraph"
    },
    {
      title: "2. Description of Service",
      content: "Hiking Trails provides a platform for hikers to discover, share, and track their hiking adventures. Our service includes:",
      type: "list",
      items: [
        "Browsing and discovering hiking trails",
        "Uploading and sharing personal hiking tracks",
        "Community features for hikers to connect",
        "Tools for tracking and planning hiking adventures"
      ]
    },
    {
      title: "3. User Accounts",
      content: "To access certain features of the service, you must register for an account. You agree to:",
      type: "list",
      items: [
        "Provide accurate and complete information",
        "Maintain the security of your account",
        "Promptly update any changes to your information",
        "Accept responsibility for all activities under your account"
      ]
    },
    {
      title: "4. User Content",
      content: "You retain ownership of any content you upload to Hiking Trails. By uploading content, you:",
      type: "list",
      items: [
        "Grant us a license to use, modify, and display your content",
        "Ensure you have the necessary rights to share the content",
        "Agree not to upload harmful or illegal content"
      ]
    },
    {
      title: "5. Safety and Responsibility",
      content: "While using Hiking Trails, you agree to:",
      type: "list",
      items: [
        "Follow all applicable laws and regulations",
        "Respect private property and protected areas",
        "Practice responsible hiking and outdoor ethics",
        "Verify trail information before embarking on hikes"
      ]
    },
    {
      title: "6. Privacy",
      content: "Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your information.",
      type: "paragraph",
      hasLink: true
    },
    {
      title: "7. Modifications to Terms",
      content: "We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the website.",
      type: "paragraph"
    },
    {
      title: "8. Contact Information",
      content: "If you have any questions about these Terms of Service, please contact us at:",
      type: "contact",
      email: "support@hikingtrails.com"
    }
  ]
};

function TermsPage() {
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

        {section.hasLink && (
          <p className="text-gray-600 mb-4">
            Your privacy is important to us. Please review our{' '}
            <Link to="/privacy" className="text-green-600 hover:text-green-500">
              Privacy Policy
            </Link>{' '}
            to understand how we collect and use your information.
          </p>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">{TERMS_CONTENT.title}</h1>
          <p className="mt-2 text-gray-600">Last updated: {TERMS_CONTENT.lastUpdated}</p>
        </div>

        <div className="prose prose-green max-w-none">
          {TERMS_CONTENT.sections.map(renderSection)}
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

export default TermsPage; 