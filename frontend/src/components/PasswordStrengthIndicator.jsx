import React from 'react';

const PasswordStrengthIndicator = ({ password, className = '' }) => {
  const checkPasswordStrength = (password) => {
    if (!password) return { score: 0, message: '' };
    
    let score = 0;
    let message = '';

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        message = 'Very Weak';
        break;
      case 2:
        message = 'Weak';
        break;
      case 3:
        message = 'Medium';
        break;
      case 4:
        message = 'Strong';
        break;
      case 5:
        message = 'Very Strong';
        break;
      default:
        message = '';
    }

    return { score, message };
  };

  const passwordStrength = checkPasswordStrength(password);

  if (!password) return null;

  return (
    <div className={className}>
      <div className="flex items-center">
        <div className="flex-1 h-2 bg-gray-200 rounded-full">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              passwordStrength.score <= 2
                ? 'bg-red-500'
                : passwordStrength.score <= 3
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
          ></div>
        </div>
        <span 
          className={`ml-2 text-sm font-medium ${
            passwordStrength.score <= 2
              ? 'text-red-600'
              : passwordStrength.score <= 3
              ? 'text-yellow-600'
              : 'text-green-600'
          }`}
        >
          {passwordStrength.message}
        </span>
      </div>
      
      {/* Password Requirements */}
      <div className="mt-2 space-y-1">
        <div className="grid grid-cols-1 gap-1 text-xs">
          <div className={`flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
            {password.length >= 8 ? '✓' : '○'} At least 8 characters
          </div>
          <div className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
            {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase letter
          </div>
          <div className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
            {/[a-z]/.test(password) ? '✓' : '○'} Lowercase letter
          </div>
          <div className={`flex items-center ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
            {/[0-9]/.test(password) ? '✓' : '○'} Number
          </div>
          <div className={`flex items-center ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
            {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} Special character
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;