import React, { useState } from 'react';

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('basic');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [email] = useState('user@example.com'); // This would come from user context in real app

  // Mock data for login devices
  const loginHistory = [
    {
      id: 1,
      device: 'Chrome on Windows',
      location: 'New York, USA',
      lastActive: '2024-03-15 14:30',
      current: true
    },
    {
      id: 2,
      device: 'Safari on iPhone',
      location: 'New York, USA',
      lastActive: '2024-03-14 09:15',
      current: false
    }
  ];

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Basic Information</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <input
            type="email"
            value={email}
            disabled
            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500"
          />
          <p className="mt-1 text-sm text-gray-500">Email address cannot be changed as it's used for login</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nickname</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>
      <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
        Save Changes
      </button>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Security Settings</h2>
      
      {/* Password Change Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
          Update Password
        </button>
      </div>

      {/* Login History */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Login History</h3>
        <div className="space-y-4">
          {loginHistory.map((login) => (
            <div key={login.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
              <div>
                <p className="font-medium text-gray-800">{login.device}</p>
                <p className="text-sm text-gray-500">{login.location}</p>
                <p className="text-sm text-gray-500">Last active: {login.lastActive}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Privacy Settings</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
          <div>
            <h3 className="font-medium text-gray-800">Track Visibility</h3>
            <p className="text-sm text-gray-500">Control who can see your uploaded tracks</p>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500">
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
          <div>
            <h3 className="font-medium text-gray-800">Profile Visibility</h3>
            <p className="text-sm text-gray-500">Control who can view your profile</p>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500">
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
        Save Privacy Settings
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar */}
          <div className="w-full md:w-64 space-y-2">
            <button
              onClick={() => setActiveTab('basic')}
              className={`w-full text-left px-4 py-2 rounded-md ${
                activeTab === 'basic'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-green-50'
              }`}
            >
              Basic Information
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-4 py-2 rounded-md ${
                activeTab === 'security'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-green-50'
              }`}
            >
              Security Settings
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full text-left px-4 py-2 rounded-md ${
                activeTab === 'privacy'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-green-50'
              }`}
            >
              Privacy Settings
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            {activeTab === 'basic' && renderBasicInfo()}
            {activeTab === 'security' && renderSecuritySettings()}
            {activeTab === 'privacy' && renderPrivacySettings()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage; 