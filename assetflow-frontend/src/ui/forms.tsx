import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, SelectField, TextAreaField, TextField } from "./components";
import { useState, useEffect } from "react";
import { Category, Department } from "../lib/types";

const assetSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  serialNumber: z.string().min(2, "Serial number must be at least 2 characters"),
  categoryId: z.string().min(1, "Category is required"),
  departmentId: z.string().optional().nullable(),
  purchaseDate: z.string().min(1, "Acquisition date is required"),
  purchaseCost: z.coerce.number().nonnegative("Acquisition cost must be non-negative"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  currentCondition: z.string().default("GOOD"),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  isBookable: z.boolean().default(true),
  description: z.string().optional()
});

export const AssetForm = ({ 
  categories, 
  departments, 
  initialValues,
  onSubmit 
}: { 
  categories: Category[]; 
  departments: Department[]; 
  initialValues?: any;
  onSubmit: (values: any) => void 
}) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<any>({ 
    resolver: zodResolver(assetSchema) as any, 
    defaultValues: { isBookable: true, currentCondition: "GOOD", departmentId: "", description: "" } 
  });

  useEffect(() => {
    if (initialValues) {
      reset({
        ...initialValues,
        purchaseDate: initialValues.purchaseDate ? new Date(initialValues.purchaseDate).toISOString().split("T")[0] : "",
        purchaseCost: Number(initialValues.purchaseCost || 0),
        departmentId: initialValues.departmentId || "",
        description: initialValues.description || ""
      });
    } else {
      reset({ isBookable: true, currentCondition: "GOOD", departmentId: "", description: "" });
    }
  }, [initialValues, reset]);

  const selectedCategoryId = watch("categoryId");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [dynValues, setDynValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const cat = categories.find(c => c.id === selectedCategoryId) || null;
    setSelectedCategory(cat);
    if (cat?.dynamicFields) {
      const initial: Record<string, string> = {};
      cat.dynamicFields.forEach(f => {
        initial[f.key] = "";
      });
      setDynValues(initial);
    } else {
      setDynValues({});
    }
  }, [selectedCategoryId, categories]);

  const handleFormSubmit = (data: any) => {
    // Append category dynamic fields to description
    let finalDesc = data.description || "";
    if (selectedCategory?.dynamicFields?.length) {
      const dynText = selectedCategory.dynamicFields
        .map(f => `${f.label}: ${dynValues[f.key] || "N/A"}`)
        .join("\n");
      finalDesc = finalDesc ? `${finalDesc}\n\n[Custom Fields]\n${dynText}` : dynText;
    }
    
    onSubmit({
      ...data,
      description: finalDesc,
      departmentId: data.departmentId || null
    });
  };

  return (
    <form className="grid" onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="grid cols-2">
        <TextField label="Name" registration={register("name")} error={errors.name} />
        <TextField label="Serial Number" registration={register("serialNumber")} error={errors.serialNumber} />
        
        <SelectField label="Category" registration={register("categoryId")} error={errors.categoryId}>
          <option value="">Select category</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </SelectField>

        <SelectField label="Department" registration={register("departmentId")}>
          <option value="">None</option>
          {departments.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </SelectField>

        <TextField label="Acquisition Date" type="date" registration={register("purchaseDate")} error={errors.purchaseDate} />
        <TextField label="Acquisition Cost" type="number" step="0.01" registration={register("purchaseCost")} error={errors.purchaseCost} />
        <TextField label="Location" registration={register("location")} error={errors.location} />
        
        <SelectField label="Condition" registration={register("currentCondition")}>
          <option value="EXCELLENT">Excellent</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
          <option value="POOR">Poor</option>
          <option value="DAMAGED">Damaged</option>
        </SelectField>
      </div>

      {selectedCategory?.dynamicFields && selectedCategory.dynamicFields.length > 0 ? (
        <div className="card grid cols-2" style={{ background: "var(--surface-sunken)", border: "1px dashed var(--border)" }}>
          <h4 style={{ gridColumn: "span 2", margin: 0, fontSize: "14px", fontWeight: 600 }}>Category Specific Fields</h4>
          {selectedCategory.dynamicFields.map((field) => (
            <div className="field" key={field.key}>
              <label>{field.label}</label>
              <input
                className="input"
                type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
                value={dynValues[field.key] || ""}
                onChange={(e) => setDynValues({ ...dynValues, [field.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      ) : null}

      <TextField label="Photo URL" registration={register("imageUrl")} error={errors.imageUrl} />
      <TextAreaField label="Description / Notes" registration={register("description")} />
      
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input type="checkbox" id="isBookable" {...register("isBookable")} style={{ width: "18px", height: "18px" }} />
        <label htmlFor="isBookable" style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink-700)", cursor: "pointer" }}>
          Shared / bookable resource
        </label>
      </div>

      <Button variant="primary" type="submit">{initialValues ? "Update Asset" : "Register Asset"}</Button>
    </form>
  );
};

export const SimpleRecordForm = ({ 
  fields, 
  submitLabel, 
  onSubmit 
}: { 
  fields: Array<{ name: string; label: string; type?: string }>; 
  submitLabel: string; 
  onSubmit: (values: Record<string, string>) => void 
}) => {
  const schema = z.object(Object.fromEntries(fields.map((field) => [field.name, z.string().min(1, `${field.label} is required`)])));
  const { register, handleSubmit, formState: { errors } } = useForm<any>({ resolver: zodResolver(schema) as any });
  return (
    <form className="grid" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <TextField key={field.name} label={field.label} type={field.type} registration={register(field.name)} error={errors[field.name]} />
      ))}
      <Button variant="primary" type="submit">{submitLabel}</Button>
    </form>
  );
};

export const RequestForm = ({ 
  onSubmit, 
  submitLabel = "Submit Request" 
}: { 
  onSubmit: (values: { reason: string; targetEmployeeId?: string }) => void; 
  submitLabel?: string 
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<any>({ 
    resolver: zodResolver(z.object({ targetEmployeeId: z.string().optional(), reason: z.string().min(3, "Reason must be at least 3 characters") })) as any 
  });
  return (
    <form className="grid" onSubmit={handleSubmit((values) => onSubmit(values as any))}>
      <TextField label="To Employee ID" registration={register("targetEmployeeId")} error={errors.targetEmployeeId} />
      <TextAreaField label="Reason" registration={register("reason")} error={errors.reason} />
      <Button variant="primary" type="submit">{submitLabel}</Button>
    </form>
  );
};
