import { useState, useEffect } from 'react';
import { Shield, Users, Settings, Eye, EyeOff, Edit2, Save, X, UserPlus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['HR', 'Tech Interviewer', 'Manager', 'Recruiter']),
  canViewSalary: z.boolean(),
  canMoveCandidate: z.boolean(),
  canEditJob: z.boolean(),
  canManageUsers: z.boolean(),
  company: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface AdminSettingsProps { }

export function AdminSettings({ }: AdminSettingsProps) {


  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<string[]>([]); // Companies list
  const [erpEmployees, setErpEmployees] = useState<any[]>([]); // ERP Employees
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [showImportModal, setShowImportModal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.users.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadCompanies = async () => {
    // Check for Super Admin (isSuperUser flag OR email 'administrator' case-insensitive)
    const isSuperAdmin = currentUser.isSuperUser || currentUser.email.toLowerCase() === 'administrator';

    if (isSuperAdmin) {
      try {
        const list = await api.users.getCompanies();
        setCompanies(list);
      } catch (e) { console.error("Failed to load companies", e); }
    }
  };

  // Form for adding new user
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    setValue: setValueAdd,
    watch: watchAdd,
    formState: { errors: errorsAdd }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'Tech Interviewer',
      canViewSalary: false,
      canMoveCandidate: false,
      canEditJob: false,
      canManageUsers: false,
    }
  });

  // Form for editing existing user
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    watch: watchEdit,
    formState: { errors: errorsEdit }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  const getRolePermissions = (role: UserRole) => {
    switch (role) {
      case 'HR':
        return { canViewSalary: true, canMoveCandidate: true, canEditJob: true, canManageUsers: true };
      case 'Tech Interviewer':
        return { canViewSalary: false, canMoveCandidate: false, canEditJob: false, canManageUsers: false };
      case 'Manager':
        return { canViewSalary: true, canMoveCandidate: true, canEditJob: false, canManageUsers: false };
      case 'Recruiter':
        return { canViewSalary: false, canMoveCandidate: true, canEditJob: true, canManageUsers: false };
      default:
        return { canViewSalary: false, canMoveCandidate: false, canEditJob: false, canManageUsers: false };
    }
  };

  // Watch roles to update permissions automatically
  const addRole = watchAdd('role');
  const editRole = watchEdit('role');

  useEffect(() => {
    const permissions = getRolePermissions(addRole as UserRole);
    setValueAdd('canViewSalary', permissions.canViewSalary);
    setValueAdd('canMoveCandidate', permissions.canMoveCandidate);
    setValueAdd('canEditJob', permissions.canEditJob);
    setValueAdd('canManageUsers', permissions.canManageUsers);
  }, [addRole, setValueAdd]);

  useEffect(() => {
    if (editingId) {
      const permissions = getRolePermissions(editRole as UserRole);
      setValueEdit('canViewSalary', permissions.canViewSalary);
      setValueEdit('canMoveCandidate', permissions.canMoveCandidate);
      setValueEdit('canEditJob', permissions.canEditJob);
      setValueEdit('canManageUsers', permissions.canManageUsers);
    }
  }, [editRole, editingId, setValueEdit]);

  const startEdit = (userId: string) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      setEditingId(userId);
      resetEdit({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
        canViewSalary: userToEdit.canViewSalary,
        canMoveCandidate: userToEdit.canMoveCandidate,
        canEditJob: userToEdit.canEditJob,
        canManageUsers: userToEdit.canManageUsers || false,
      });
    }
  };

  const onSaveEdit = async (data: UserFormValues) => {
    if (editingId) {
      try {
        const userToEdit = users.find(u => u.id === editingId);
        if (!userToEdit) return;

        // Backend expects password for UserCreate schema validation
        const updateData = {
          ...data,
          password: "password" // Dummy password to satisfy validation, handled on backend to not overwrite if not needed or separate logic needed
        };

        const updatedUser = await api.users.update(editingId, updateData);
        setUsers(prev => prev.map(u => u.id === editingId ? updatedUser : u));
        setEditingId(null);
        resetEdit();
        alert('User permissions updated successfully');
      } catch (error) {
        console.error("Failed to update user:", error);
        alert("Failed to update user permissions");
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetEdit();
  };

  const onAddUser = async (data: UserFormValues) => {
    try {
      // Add default password for new users
      const userToCreate = {
        ...data,
        password: 'password123' // Default password
      };
      await api.users.create(userToCreate);
      await loadUsers();
      setShowAddModal(false);
      resetAdd();
      alert('User created successfully. Default password is "password123"');
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    }
  };

  const removeUser = async (userId: string) => {
    const userToRemove = users.find(u => u.id === userId);
    if (userToRemove?.role === 'HR' && users.filter(u => u.role === 'HR').length === 1) {
      alert('Cannot remove the last HR user');
      return;
    }

    if (confirm(`Are you sure you want to remove ${userToRemove?.name}?`)) {
      try {
        await api.users.delete(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
        alert('User removed successfully');
      } catch (error) {
        console.error('Failed to remove user:', error);
        alert('Failed to remove user');
      }
    }
  };

  const handleFetchErpEmployees = async (company: string) => {
    if (!company) return;
    try {
      const emps = await api.users.getERPEmployees(company);
      setErpEmployees(emps);
      setSelectedCompany(company);
      setShowImportModal(true);
    } catch (e) {
      console.error("Failed to fetch ERP employees", e);
      alert("Failed to fetch employees from ERP");
    }
  };

  const importEmployee = async (emp: any) => {
    try {
      // Prepare payload
      const payload = {
        ...emp,
        company: selectedCompany
      };
      await api.users.importUser(payload);
      alert(`Imported ${emp.employee_name} successfully!`);
      loadUsers(); // Refresh list
    } catch (e) {
      console.error("Import failed", e);
      alert("Failed to import user");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-gray-900 mb-2">Admin Settings</h1>
        <p className="text-gray-600">Manage user roles and permissions</p>
      </div>

      {/* Role Permissions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* HR Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-gray-900">HR</h3>
                <p className="text-blue-600 text-xs">
                  {users.filter(u => u.role === 'HR').length} user(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add HR User"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-600">
              <Eye className="w-4 h-4" />
              View Salary: Yes
            </li>
            <li className="flex items-center gap-2 text-green-600">
              <Users className="w-4 h-4" />
              Move Candidates: Yes
            </li>
            <li className="flex items-center gap-2 text-green-600">
              <Edit2 className="w-4 h-4" />
              Edit Jobs: Yes
            </li>
          </ul>
        </div>

        {/* Tech Interviewer Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-gray-900">Tech Interviewer</h3>
                <p className="text-purple-600 text-xs">
                  {users.filter(u => u.role === 'Tech Interviewer').length} user(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetAdd({ role: 'Tech Interviewer' });
                setShowAddModal(true);
              }}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Add Tech Interviewer"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-red-600">
              <EyeOff className="w-4 h-4" />
              View Salary: No
            </li>
            <li className="flex items-center gap-2 text-red-600">
              <X className="w-4 h-4" />
              Move Candidates: No
            </li>
            <li className="flex items-center gap-2 text-red-600">
              <X className="w-4 h-4" />
              Edit Jobs: No
            </li>
          </ul>
        </div>

        {/* Manager Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-gray-900">Manager</h3>
                <p className="text-green-600 text-xs">
                  {users.filter(u => u.role === 'Manager').length} user(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetAdd({ role: 'Manager' });
                setShowAddModal(true);
              }}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Add Manager"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-600">
              <Eye className="w-4 h-4" />
              View Salary: Yes
            </li>
            <li className="flex items-center gap-2 text-green-600">
              <Users className="w-4 h-4" />
              Move Candidates: Yes
            </li>
            <li className="flex items-center gap-2 text-red-600">
              <X className="w-4 h-4" />
              Edit Jobs: No
            </li>
          </ul>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-gray-900">User Management</h2>
            <p className="text-gray-600 text-sm mt-1">Add or remove Tech Interviewers and Managers</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Import Bar for Admin/HR */}
        {(currentUser.isSuperUser || currentUser.email.toLowerCase() === 'administrator') && (
          <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <span className="text-blue-800 font-medium text-sm">Import from ERP:</span>
              <select
                className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                onChange={(e) => handleFetchErpEmployees(e.target.value)}
                value=""
              >
                <option value="" disabled>Select Company to Import HRs...</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              onClick={async () => {
                try {
                  await api.users.refreshErp();
                  alert('ERP Cache Cleared. Fetching fresh data...');
                  loadCompanies();
                } catch (e) {
                  console.error(e);
                  alert('Failed to refresh cache');
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-3 py-1.5 rounded border border-blue-200 shadow-sm hover:shadow"
              title="Force Refresh Data from ERP"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">Name</th>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">Email</th>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">Role</th>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">View Salary</th>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">Move Candidates</th>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">Edit Jobs</th>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">Manage Users</th>
                <th className="px-4 md:px-6 py-3 text-left text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <div>
                        <input
                          type="text"
                          {...registerEdit('name')}
                          className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorsEdit.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errorsEdit.name && <p className="text-xs text-red-600 mt-1">{errorsEdit.name.message}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-900">{u.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <div>
                        <input
                          type="email"
                          {...registerEdit('email')}
                          className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorsEdit.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {errorsEdit.email && <p className="text-xs text-red-600 mt-1">{errorsEdit.email.message}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-600">{u.email}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <select
                        {...registerEdit('role')}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="HR">HR</option>
                        <option value="Tech Interviewer">Tech Interviewer</option>
                        <option value="Manager">Manager</option>
                        <option value="Recruiter">Recruiter</option>
                      </select>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${u.email === 'administrator'
                          ? 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200'
                          : u.role === 'HR'
                            ? 'bg-blue-100 text-blue-700'
                            : u.role === 'Tech Interviewer'
                              ? 'bg-purple-100 text-purple-700'
                              : u.role === 'Manager'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                          }`}
                      >
                        {u.email === 'administrator' ? 'Super HR' : u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <input
                        type="checkbox"
                        {...registerEdit('canViewSalary')}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    ) : u.canViewSalary ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <input
                        type="checkbox"
                        {...registerEdit('canMoveCandidate')}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    ) : u.canMoveCandidate ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <input
                        type="checkbox"
                        {...registerEdit('canEditJob')}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    ) : u.canEditJob ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <input
                        type="checkbox"
                        {...registerEdit('canManageUsers')}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    ) : u.canManageUsers ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === u.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSubmitEdit(onSaveEdit)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Save"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(u.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => removeUser(u.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove User"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          <strong>Important:</strong> The salary visibility restriction is a critical DFD requirement. Tech Interviewers should never have access to salary information to maintain unbiased technical evaluations.
        </p>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add New User</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitAdd(onAddUser)}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    {...registerAdd('name')}
                    placeholder="Enter full name"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorsAdd.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errorsAdd.name && (
                    <p className="mt-1 text-sm text-red-600">{errorsAdd.name.message}</p>
                  )}
                </div>

                {/* Company Selection for Super Admin */}
                {(currentUser.isSuperUser || currentUser.email.toLowerCase() === 'administrator') && (
                  <div>
                    <label className="block text-gray-700 mb-2">Assign Company</label>
                    <select
                      {...registerAdd('company')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Company</option>
                      {companies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    {...registerAdd('email')}
                    placeholder="user@company.com"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorsAdd.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errorsAdd.email && (
                    <p className="mt-1 text-sm text-red-600">{errorsAdd.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Role</label>
                  <select
                    {...registerAdd('role')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Tech Interviewer">Tech Interviewer</option>
                    <option value="Manager">Manager</option>
                    <option value="HR">HR</option>
                    <option value="Recruiter">Recruiter</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Permissions for {addRole}:</strong>
                  </p>
                  <ul className="text-blue-700 text-sm mt-2 space-y-1">
                    {addRole === 'Tech Interviewer' && (
                      <>
                        <li>• Cannot view salary information</li>
                        <li>• Cannot move candidates between stages</li>
                        <li>• Cannot edit job postings</li>
                        <li>• Can provide interview feedback</li>
                      </>
                    )}
                    {addRole === 'Manager' && (
                      <>
                        <li>• Can view salary information</li>
                        <li>• Can move candidates between stages</li>
                        <li>• Cannot edit job postings</li>
                        <li>• Can provide interview feedback</li>
                      </>
                    )}
                    {addRole === 'HR' && (
                      <>
                        <li>• Full access to all features</li>
                        <li>• Can view salary information</li>
                        <li>• Can move candidates and edit jobs</li>
                        <li>• Can manage users</li>
                      </>
                    )}
                    {addRole === 'Recruiter' && (
                      <>
                        <li>• Can view only assigned candidates</li>
                        <li>• Cannot view salary information</li>
                        <li>• Can move candidates and edit jobs</li>
                      </>
                    )}
                    {addRole !== 'HR' && (
                      <li>• Cannot manage users (unless granted)</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-gray-900 text-lg font-semibold">Import Employees from {selectedCompany}</h2>
                <p className="text-sm text-gray-500">Select employees to create as HR/Users in system</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-0">
              {erpEmployees.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No active employees found with email/user_id for this company.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email/User ID</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {erpEmployees.map((emp, idx) => {
                      // Check if user already exists in our local list to show 'Imported'
                      const isImported = users.some(u => u.email === (emp.company_email || emp.user_id));
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{emp.employee_name}</td>
                          <td className="px-6 py-3 text-gray-500">{emp.company_email || emp.user_id || "N/A"}</td>
                          <td className="px-6 py-3">
                            {isImported ? (
                              <span className="text-green-600 font-medium text-xs px-2 py-1 bg-green-50 rounded">Imported</span>
                            ) : (
                              <button
                                onClick={() => importEmployee(emp)}
                                className="text-blue-600 hover:text-blue-800 font-medium px-3 py-1 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                              >
                                Import
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 text-right">
              <button
                onClick={() => setShowImportModal(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
