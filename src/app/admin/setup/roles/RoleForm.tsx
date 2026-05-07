"use client";

import { useState } from "react";
import { Save, X, Info, ShieldAlert } from "lucide-react";
import { createRole, updateRole } from "./actions";

export default function RoleForm({ role, permissions, onClose }: any) {
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
    new Set(role?.permissions?.map((p: any) => p.id) || [])
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Group permissions by subject
  const subjects = Array.from(new Set(permissions.map((p: any) => p.subject)));

  const togglePermission = (id: string) => {
    const newPerms = new Set(selectedPerms);
    if (newPerms.has(id)) {
      newPerms.delete(id);
    } else {
      newPerms.add(id);
    }
    setSelectedPerms(newPerms);
  };

  const toggleSubjectAll = (subject: string, subjectPerms: any[]) => {
    const newPerms = new Set(selectedPerms);
    const allSelected = subjectPerms.every((p) => newPerms.has(p.id));

    if (allSelected) {
      subjectPerms.forEach((p) => newPerms.delete(p.id));
    } else {
      subjectPerms.forEach((p) => newPerms.add(p.id));
    }
    setSelectedPerms(newPerms);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (role) {
        await updateRole(role.id, { name, description, permissionIds: Array.from(selectedPerms) });
      } else {
        await createRole({ name, description, permissionIds: Array.from(selectedPerms) });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-slate-500" />
              {role ? `Edit Role: ${role.name}` : "Create New Role"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Configure role details and specific permission matrix policies.</p>
          </div>
          <button 
            onClick={onClose} 
            type="button" 
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                disabled={role?.name === "SUPERADMIN"}
                placeholder="e.g. INVENTORY_MANAGER"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this role does."
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-4">
              Permission Matrix
            </h4>
            
            {role?.name === "SUPERADMIN" ? (
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-md text-xs flex items-center gap-2">
                <Info className="w-4 h-4" />
                SUPERADMIN role implicitly holds all permissions. Matrix editing is locked.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(subjects as string[]).map((subject) => {
                  const subjectPerms = permissions.filter((p: any) => p.subject === subject);
                  const allSelected = subjectPerms.every((p: any) => selectedPerms.has(p.id));

                  return (
                    <div key={subject} className="bg-slate-50 border border-slate-200 rounded-md overflow-hidden hover:border-slate-300 transition-colors">
                      <div className="px-3.5 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-100/70">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {subject.replace(/_/g, " ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSubjectAll(subject, subjectPerms)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide transition-colors"
                        >
                          {allSelected ? "Clear All" : "Select All"}
                        </button>
                      </div>
                      <div className="p-3.5 space-y-2.5">
                        {subjectPerms.map((perm: any) => (
                          <label key={perm.id} className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                            />
                            <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                              {perm.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 border border-slate-200 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={isLoading}
            className="h-10 px-4 flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Saving..." : "Save Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
