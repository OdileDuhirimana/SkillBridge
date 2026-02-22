import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserIcon,
  PencilIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  school: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'beginner' as const });
  const [showAddSkill, setShowAddSkill] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSkills([
        { id: '1', name: 'React', level: 'expert' },
        { id: '2', name: 'TypeScript', level: 'advanced' },
        { id: '3', name: 'Node.js', level: 'intermediate' },
        { id: '4', name: 'Python', level: 'beginner' },
      ]);

      setExperience([
        {
          id: '1',
          title: 'Senior Frontend Developer',
          company: 'TechCorp',
          location: 'San Francisco, CA',
          startDate: '2022-01-01',
          current: true,
          description: 'Led frontend development for multiple products using React and TypeScript.',
        },
        {
          id: '2',
          title: 'Frontend Developer',
          company: 'StartupXYZ',
          location: 'New York, NY',
          startDate: '2020-06-01',
          endDate: '2021-12-31',
          current: false,
          description: 'Developed user interfaces for web applications using React and Redux.',
        },
      ]);

      setEducation([
        {
          id: '1',
          degree: 'Bachelor of Science',
          school: 'University of California',
          field: 'Computer Science',
          startDate: '2016-09-01',
          endDate: '2020-05-31',
          current: false,
        },
      ]);

      setLoading(false);
    }, 1000);
  };

  const handleAddSkill = () => {
    if (newSkill.name.trim()) {
      const skill: Skill = {
        id: Date.now().toString(),
        name: newSkill.name,
        level: newSkill.level,
      };
      setSkills(prev => [...prev, skill]);
      setNewSkill({ name: '', level: 'beginner' });
      setShowAddSkill(false);
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    setSkills(prev => prev.filter(skill => skill.id !== skillId));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="h-10 w-10 text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-sm text-gray-500">
                {user?.role === 'student' ? 'Job Seeker' : 'Employer'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'experience', name: 'Experience' },
              { id: 'education', name: 'Education' },
              { id: 'skills', name: 'Skills' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                  {user?.bio || 'No bio available. Add a bio to tell others about yourself.'}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Location</h3>
                <p className="text-gray-600">{user?.location || 'No location specified'}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Contact</h3>
                <div className="space-y-1">
                  <p className="text-gray-600">Email: {user?.email}</p>
                  {user?.phone && <p className="text-gray-600">Phone: {user.phone}</p>}
                  {user?.website && <p className="text-gray-600">Website: {user.website}</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Work Experience</h3>
                {editing && (
                  <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Experience
                  </button>
                )}
              </div>
              {experience.map((exp) => (
                <div key={exp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{exp.title}</h4>
                      <p className="text-gray-600">{exp.company}</p>
                      <p className="text-sm text-gray-500">{exp.location}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(exp.startDate).toLocaleDateString()} -{' '}
                        {exp.current ? 'Present' : new Date(exp.endDate!).toLocaleDateString()}
                      </p>
                      <p className="text-gray-600 mt-2">{exp.description}</p>
                    </div>
                    {editing && (
                      <button className="text-red-600 hover:text-red-500">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Education</h3>
                {editing && (
                  <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Education
                  </button>
                )}
              </div>
              {education.map((edu) => (
                <div key={edu.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{edu.degree}</h4>
                      <p className="text-gray-600">{edu.school}</p>
                      <p className="text-sm text-gray-500">{edu.field}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(edu.startDate).toLocaleDateString()} -{' '}
                        {edu.current ? 'Present' : new Date(edu.endDate!).toLocaleDateString()}
                      </p>
                    </div>
                    {editing && (
                      <button className="text-red-600 hover:text-red-500">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Skill
                  </button>
                )}
              </div>

              {showAddSkill && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Skill Name
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newSkill.name}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter skill name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Level
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newSkill.level}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, level: e.target.value as any }))}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddSkill}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Add
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

              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    <span>{skill.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getLevelColor(skill.level)}`}>
                      {skill.level}
                    </span>
                    {editing && (
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="text-red-600 hover:text-red-500"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
