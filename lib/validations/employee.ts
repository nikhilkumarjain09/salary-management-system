import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  employeeCode: z
    .string()
    .min(3, "Employee Code must be at least 3 characters"),
  department: z.string().min(1, "Department is required"),
  level: z.enum(["L1", "L2", "L3", "L4", "L5"]),
  country: z.enum([
    "US", "IN", "UK", "DE", "SG", "BR",
    "CA", "AU", "FR", "JP", "AE", "NL", "CH"
  ]),
  startDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  isActive: z.boolean().default(true),
  managerId: z.string().uuid().nullable().optional(),
  initialSalary: z
    .number()
    .min(0, "Initial salary must be greater than or equal to 0"),
  currency: z.enum([
    "USD", "INR", "GBP", "EUR", "SGD", "BRL",
    "CAD", "AUD", "JPY", "AED", "CHF"
  ]),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  department: z.string().min(1, "Department is required").optional(),
  level: z.enum(["L1", "L2", "L3", "L4", "L5"]).optional(),
  country: z.enum([
    "US", "IN", "UK", "DE", "SG", "BR",
    "CA", "AU", "FR", "JP", "AE", "NL", "CH"
  ]).optional(),
  isActive: z.boolean().optional(),
  managerId: z.string().uuid().nullable().optional(),
});
