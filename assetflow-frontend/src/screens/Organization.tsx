import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShieldAlert, ArrowRight, UserCheck } from "lucide-react";
import { useState } from "react";
import { api, unwrap, toastApiError } from "../lib/api";
import { useList } from "../lib/queries";
import { Category, Department, User } from "../lib/types";
import { Button, DataTable, Section, StatusChip, TextField, SelectField } from "../ui/components";
import { toast } from "sonner";

export default function Organization() {
  const [tab, setTab] = useState<"departments" | "categories" | "employees">("departments");
  const qc = useQueryClient();

  const departments = useList<Department>("departments", "/departments");
  const categories = useList<Category>("categories", "/asset-categories");
  const employees = useList<User>("employees", "/employees");

  // Dynamic Fields State for Categories
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [dynamicFields, setDynamicFields] = useState<Array<{ key: string; label: string; type: string }>>([]);

  // Form states for Department creation
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptHeadId, setDeptHeadId] = useState("");
  const [parentDeptId, setParentDeptId] = useState("");

  // Employee tab filters
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("");

  const createDepartment = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/departments", body)),
    onSuccess: () => {
      toast.success("Department created");
      setDeptName("");
      setDeptCode("");
      setDeptHeadId("");
      setParentDeptId("");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: toastApiError
  });

  const deactivateDepartment = useMutation({
    mutationFn: (id: string) => unwrap(api.patch(`/departments/${id}/deactivate`)),
    onSuccess: () => {
      toast.success("Department deactivated");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: toastApiError
  });

  const createCategory = useMutation({
    mutationFn: (body: any) => unwrap(api.post("/asset-categories", body)),
    onSuccess: () => {
      toast.success("Category created");
      setCatName("");
      setCatDesc("");
      setDynamicFields([]);
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: toastApiError
  });

  const promote = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => unwrap(api.patch(`/employees/${id}/role`, { role })),
    onSuccess: () => {
      toast.success("Employee role updated");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: toastApiError
  });

  const handleAddDynamicField = () => {
    setDynamicFields([...dynamicFields, { key: "", label: "", type: "TEXT" }]);
  };

  const handleRemoveDynamicField = (index: number) => {
    setDynamicFields(dynamicFields.filter((_, idx) => idx !== index));
  };

  const handleUpdateDynamicField = (index: number, field: string, value: string) => {
    const updated = [...dynamicFields];
    updated[index] = { ...updated[index], [field]: value };
    setDynamicFields(updated);
  };

  // Filtered employees
  const filteredEmployees = employees.data?.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) || 
                          emp.email.toLowerCase().includes(employeeSearch.toLowerCase());
    const matchesRole = !employeeRoleFilter || emp.role === employeeRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title">Organization Setup</h1>
      </div>

      <div className="tabs">
        <button className={tab === "departments" ? "active" : ""} onClick={() => setTab("departments")}>Departments</button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>Categories</button>
        <button className={tab === "employees" ? "active" : ""} onClick={() => setTab("employees")}>Employee Directory</button>
      </div>

      {tab === "departments" ? (
        <Section query={departments}>
          <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "320px 1fr" }}>
            <div className="card grid" style={{ alignContent: "start", gap: "16px" }}>
              <h2 className="section-title">Create Department</h2>
              <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
                Editing a department here also drives the picklist in Assets and Allocation & Transfer.
              </p>
              <TextField label="Department Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
              <TextField label="Code" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
              
              <SelectField label="Department Head" value={deptHeadId} onChange={(e) => setDeptHeadId(e.target.value)}>
                <option value="">Select Head</option>
                {employees.data?.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </SelectField>

              <SelectField label="Parent Department" value={parentDeptId} onChange={(e) => setParentDeptId(e.target.value)}>
                <option value="">None (Top Level)</option>
                {departments.data?.filter(d => d.status === "ACTIVE").map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </SelectField>

              <Button variant="primary" onClick={() => createDepartment.mutate({
                name: deptName,
                code: deptCode,
                headId: deptHeadId || null,
                parentDepartmentId: parentDeptId || null
              })}>Create Department</Button>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              <div className="alert info" style={{ fontSize: "13px" }}>
                <strong>Note:</strong> Editing a department here also drives the picklist in Assets and Allocation & Transfer.
              </div>

              <DataTable
                data={departments.data}
                empty="No departments yet"
                columns={[
                  { 
                    header: "Department", 
                    cell: ({ row }) => (
                      <div style={{ paddingLeft: row.original.parentDepartmentId ? "24px" : "0" }}>
                        {row.original.parentDepartmentId ? "↳ " : ""}
                        <strong>{row.original.name}</strong>
                        <span className="mono muted" style={{ fontSize: "11px", marginLeft: "6px" }}>({row.original.code})</span>
                      </div>
                    ) 
                  },
                  { header: "Head", cell: ({ row }) => row.original.head?.name ?? "Unassigned" },
                  { header: "Parent Dept", cell: ({ row }) => row.original.parentDepartment?.name ?? "None" },
                  { header: "Status", cell: ({ row }) => <StatusChip status={row.original.status} /> },
                  { 
                    header: "Actions", 
                    cell: ({ row }) => (
                      row.original.status === "ACTIVE" ? (
                        <Button variant="danger" style={{ minHeight: "32px", padding: "0 10px" }} onClick={() => deactivateDepartment.mutate(row.original.id)}>
                          Deactivate
                        </Button>
                      ) : null
                    ) 
                  }
                ]}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {tab === "categories" ? (
        <Section query={categories}>
          <div style={{ display: "grid", gap: "24px", gridTemplateColumns: "360px 1fr" }}>
            <div className="card grid" style={{ alignContent: "start", gap: "16px" }}>
              <h2 className="section-title">Create Category</h2>
              <TextField label="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} />
              <TextField label="Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />

              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink-700)" }}>Dynamic Fields</label>
                  <Button type="button" style={{ minHeight: "28px", padding: "0 8px", fontSize: "12px" }} onClick={handleAddDynamicField}>+ Add</Button>
                </div>

                {dynamicFields.map((field, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input
                      className="input"
                      placeholder="Key (e.g. warranty)"
                      style={{ padding: "6px 8px", minHeight: "36px", fontSize: "13px" }}
                      value={field.key}
                      onChange={(e) => handleUpdateDynamicField(idx, "key", e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Label"
                      style={{ padding: "6px 8px", minHeight: "36px", fontSize: "13px" }}
                      value={field.label}
                      onChange={(e) => handleUpdateDynamicField(idx, "label", e.target.value)}
                    />
                    <select
                      className="select"
                      style={{ padding: "6px 8px", minHeight: "36px", fontSize: "13px", width: "100px" }}
                      value={field.type}
                      onChange={(e) => handleUpdateDynamicField(idx, "type", e.target.value)}
                    >
                      <option value="TEXT">Text</option>
                      <option value="NUMBER">Number</option>
                      <option value="DATE">Date</option>
                    </select>
                    <button
                      type="button"
                      style={{ background: "none", border: 0, padding: 0, minHeight: "unset", color: "var(--danger-text)", cursor: "pointer" }}
                      onClick={() => handleRemoveDynamicField(idx)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="primary" onClick={() => createCategory.mutate({
                name: catName,
                description: catDesc,
                dynamicFields
              })}>Create Category</Button>
            </div>

            <div>
              <DataTable
                data={categories.data}
                empty="No categories yet"
                columns={[
                  { header: "Category", accessorKey: "name" },
                  { header: "Description", accessorKey: "description" },
                  { 
                    header: "Custom Fields", 
                    cell: ({ row }) => (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {row.original.dynamicFields?.map((df: any) => (
                          <span key={df.key} className="mono muted" style={{ fontSize: "11px", background: "var(--surface-sunken)", padding: "2px 6px", borderRadius: "4px" }}>
                            {df.label} ({df.type.toLowerCase()})
                          </span>
                        )) ?? "None"}
                      </div>
                    ) 
                  },
                  { header: "Status", cell: ({ row }) => <StatusChip status={row.original.status} /> }
                ]}
              />
            </div>
          </div>
        </Section>
      ) : null}

      {tab === "employees" ? (
        <Section query={employees}>
          <div style={{ display: "grid", gap: "16px" }}>
            <div className="card" style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--signal-500)" }}>
                <ShieldAlert size={20} />
                <h3 className="section-title" style={{ fontSize: "15px" }}>Role Management Authority</h3>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                This directory is the only role-assignment surface in the entire application. Use the promote actions below to elevate employees to Asset Managers or Department Heads.
              </p>
            </div>

            <div className="toolbar" style={{ background: "var(--surface)", padding: "12px", border: "1px solid var(--border)", borderRadius: "var(--rounded-lg)" }}>
              <div className="actions" style={{ flex: 1 }}>
                <input
                  className="input"
                  placeholder="Search by name or email..."
                  style={{ maxWidth: "300px" }}
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
                <select
                  className="select"
                  style={{ maxWidth: "160px" }}
                  value={employeeRoleFilter}
                  onChange={(e) => setEmployeeRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>
            </div>

            <DataTable
              data={filteredEmployees}
              empty="No employees found"
              columns={[
                { header: "Name", accessorKey: "name" },
                { header: "Email", accessorKey: "email" },
                { header: "Role", cell: ({ row }) => <StatusChip status={row.original.role} /> },
                { 
                  header: "Actions", 
                  cell: ({ row }) => (
                    row.original.role !== "ADMIN" ? (
                      <div className="actions">
                        <Button style={{ minHeight: "32px", padding: "0 10px", fontSize: "13px" }} onClick={() => promote.mutate({ id: row.original.id, role: "DEPARTMENT_HEAD" })}>
                          <UserCheck size={14} /> Promote Head
                        </Button>
                        <Button style={{ minHeight: "32px", padding: "0 10px", fontSize: "13px" }} onClick={() => promote.mutate({ id: row.original.id, role: "ASSET_MANAGER" })}>
                          <UserCheck size={14} /> Promote Manager
                        </Button>
                        {row.original.role !== "EMPLOYEE" ? (
                          <Button variant="danger" style={{ minHeight: "32px", padding: "0 10px", fontSize: "13px" }} onClick={() => promote.mutate({ id: row.original.id, role: "EMPLOYEE" })}>
                            Demote
                          </Button>
                        ) : null}
                      </div>
                    ) : <span className="muted" style={{ fontSize: "13px" }}>System Administrator</span>
                  ) 
                }
              ]}
            />
          </div>
        </Section>
      ) : null}
    </>
  );
}
