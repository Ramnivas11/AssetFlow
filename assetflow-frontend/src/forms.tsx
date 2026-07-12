import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, SelectField, TextAreaField, TextField } from "./components";

export const AssetForm = ({ categories, departments, onSubmit }: { categories: Array<{ id: string; name: string }>; departments: Array<{ id: string; name: string }>; onSubmit: (values: z.infer<typeof assetSchema>) => void }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<any>({ resolver: zodResolver(assetSchema) as any, defaultValues: { isBookable: true, currentCondition: "GOOD" } });
  return (
    <form className="grid" onSubmit={handleSubmit((values) => onSubmit(values as unknown as z.infer<typeof assetSchema>))}>
      <div className="grid cols-2">
        <TextField label="Name" registration={register("name")} error={errors.name} />
        <TextField label="Serial Number" registration={register("serialNumber")} error={errors.serialNumber} />
        <SelectField label="Category" registration={register("categoryId")} error={errors.categoryId}><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
        <SelectField label="Department" registration={register("departmentId")}><option value="">None</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
        <TextField label="Acquisition Date" type="date" registration={register("purchaseDate")} error={errors.purchaseDate} />
        <TextField label="Acquisition Cost" type="number" step="0.01" registration={register("purchaseCost")} error={errors.purchaseCost} />
        <TextField label="Location" registration={register("location")} error={errors.location} />
        <SelectField label="Condition" registration={register("currentCondition")}><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="POOR">Poor</option><option value="DAMAGED">Damaged</option></SelectField>
      </div>
      <TextField label="Photo URL" registration={register("imageUrl")} />
      <label className="actions"><input type="checkbox" {...register("isBookable")} /> Shared / bookable resource</label>
      <Button variant="primary">Register Asset</Button>
    </form>
  );
};

const assetSchema = z.object({
  name: z.string().min(2),
  serialNumber: z.string().min(2),
  categoryId: z.string().min(1),
  departmentId: z.string().optional(),
  purchaseDate: z.string().min(1),
  purchaseCost: z.coerce.number().nonnegative(),
  location: z.string().min(2),
  currentCondition: z.string(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isBookable: z.boolean(),
});

export const SimpleRecordForm = ({ fields, submitLabel, onSubmit }: { fields: Array<{ name: string; label: string; type?: string }>; submitLabel: string; onSubmit: (values: Record<string, string>) => void }) => {
  const schema = z.object(Object.fromEntries(fields.map((field) => [field.name, z.string().min(1)])));
  const { register, handleSubmit, formState: { errors } } = useForm<any>({ resolver: zodResolver(schema) as any });
  return <form className="grid" onSubmit={handleSubmit(onSubmit)}>{fields.map((field) => <TextField key={field.name} label={field.label} type={field.type} registration={register(field.name)} error={errors[field.name]} />)}<Button variant="primary">{submitLabel}</Button></form>;
};

export const RequestForm = ({ onSubmit, submitLabel = "Submit Request" }: { onSubmit: (values: { reason: string; targetEmployeeId?: string }) => void; submitLabel?: string }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<any>({ resolver: zodResolver(z.object({ targetEmployeeId: z.string().optional(), reason: z.string().min(3) })) as any });
  return <form className="grid" onSubmit={handleSubmit((values) => onSubmit(values as unknown as { reason: string; targetEmployeeId?: string }))}><TextField label="To employee ID" registration={register("targetEmployeeId")} /><TextAreaField label="Reason" registration={register("reason")} error={errors.reason} /><Button variant="primary">{submitLabel}</Button></form>;
};
