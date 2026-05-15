'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  amount: z.coerce.number().gt(0, 'Amount must be greater than 0'),
  status: z.enum(['pending', 'paid'], {
    errorMap: () => ({ message: 'Select a status' }),
  }),
});

const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
});

export async function createInvoice(formData: FormData) {
  const result = FormSchema.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!result.success) {
    console.log(result.error.flatten().fieldErrors);
    return;
  }

  const { customerId, amount, status } = result.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

   try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // We'll also log the error to the console for now
    console.error(error);
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(
  id: string,
  formData: FormData
) {
  const { customerId, amount, status } = FormSchema.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  try {
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
  } catch (error) {
    // We'll also log the error to the console for now
    console.error(error);
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await sql`
    DELETE FROM invoices
    WHERE id = ${id}
  `;

  revalidatePath('/dashboard/invoices');
}