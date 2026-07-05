import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UserIcon,
  PencilIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';
import { Skill } from '../types';

const SKILL_LEVELS: Skill['level'][] = ['beginner', 'intermediate', 'advanced', 'expert'];

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [newSkill, setNewSkill] = useState<{ name: string; level: Skill['level'] }>({ name: '', level: 'beginner' });
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);

  const handleAddSkill = async () => {
    if (!user || !newSkill.name.trim()) return;

    setSavingSkill(true);
    try {
      const skills = await userService.addSkill(user.id, newSkill.name.trim(), newSkill.level);
      updateUser({ skills });
      setNewSkill({ name: '', level: 'beginner' });
      setShowAddSkill(false);
      toast.success('Skill added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add skill');
    } finally {
      setSavingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId?: string) => {
    if (!user || !skillId) return;

    try {
      const skills = await userService.deleteSkill(user.id, skillId);
      updateUser({ skills });
      toast.success('Skill removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove skill');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'expert':
        return 'text-green-600 bg-green-100';
      case 'advanced':
        return 'text-blue-600 bg-blue-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'beginner':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!user) {
    return null;
  }

  const skills = user.skills || [];
  const experience = user.experience || [];
  const education = user.education || [];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">
                {user.role === 'student' ? 'Job Seeker' : 'Employer'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            {editing ? 'Done Editing' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Profile sections">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'experience', name: 'Experience' },
              { id: 'education', name: 'Education' },
              { id: 'skills', name: 'Skills' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">About</h3>
                <p className="text-gray-600">
                  {user.bio || 'No bio available. Add a bio to tell others about yourself.'}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Location</h3>
                <p className="text-gray-600">{user.location || 'No location specified'}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Contact</h3>
                <div className="space-y-1">
                  <p className="text-gray-600">Email: {user.email}</p>
                  {user.phone && <p className="text-gray-600">Phone: {user.phone}</p>}
                  {user.website && <p className="text-gray-600">Website: {user.website}</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Work Experience</h3>
              {experience.length === 0 ? (
                <p className="text-sm text-gray-500">No work experience added yet.</p>
              ) : (
                experience.map((exp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{exp.title}</h4>
                    <p className="text-gray-600">{exp.company}</p>
                    <p className="text-sm text-gray-500">{exp.location}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(exp.startDate).toLocaleDateString()} -{' '}
                      {exp.current || !exp.endDate ? 'Present' : new Date(exp.endDate).toLocaleDateString()}
                    </p>
                    {exp.description && <p className="text-gray-600 mt-2">{exp.description}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Education</h3>
              {education.length === 0 ? (
                <p className="text-sm text-gray-500">No education history added yet.</p>
              ) : (
                education.map((edu, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{edu.degree}</h4>
                    <p className="text-gray-600">{edu.institution}</p>
                    <p className="text-sm text-gray-500">{edu.field}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(edu.startDate).toLocaleDateString()} -{' '}
                      {edu.current || !edu.endDate ? 'Present' : new Date(edu.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Skills</h3>
                {editing && (
                  <button
                    onClick={() => setShowAddSkill(true)}
                    className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Skill
                  </button>
                )}
              </div>

              {showAddSkill && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="new-skill-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Skill Name
                      </label>
                      <input
                        id="new-skill-name"
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newSkill.name}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter skill name"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-skill-level" className="block text-sm font-medium text-gray-700 mb-1">
                        Level
                      </label>
                      <select
                        id="new-skill-level"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newSkill.level}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, level: e.target.value as Skill['level'] }))}
                      >
                        {SKILL_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddSkill}
                        disabled={savingSkill || !newSkill.name.trim()}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                        {savingSkill ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        onClick={() => setShowAddSkill(false)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {skills.length === 0 ? (
                <p className="text-sm text-gray-500">No skills added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <div
                      key={skill._id || skill.name}
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                    >
                      <span>{skill.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getLevelColor(skill.level)}`}>
                        {skill.level}
                      </span>
                      {editing && (
                        <button
                          onClick={() => handleRemoveSkill(skill._id)}
                          aria-label={`Remove skill ${skill.name}`}
                          className="text-red-600 hover:text-red-500"
                        >
                          <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
