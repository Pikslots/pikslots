import type { CustomerProps } from '@pikslots/domain';
import { toCsv } from 'src/shared/csv/csv.util';

export const CUSTOMER_CSV_COLUMNS = [
  'Customer ID',
  'First Name',
  'Last Name',
  'Email',
  'Additional Email',
  'Primary Phone',
  'Additional Phone',
  'Company',
  'Address',
  'City',
  'State',
  'Zip Code',
  'Country',
  'Notes',
  'Created At',
];

export function toCustomersCsv(customers: CustomerProps[]): string {
  return toCsv(
    CUSTOMER_CSV_COLUMNS,
    customers.map((customer) => [
      customer.id,
      customer.name.firstName,
      customer.name.lastName,
      customer.email,
      customer.additionalEmail,
      customer.primaryPhone,
      customer.additionalPhone,
      customer.company,
      customer.address,
      customer.city,
      customer.state,
      customer.zipCode,
      customer.country,
      customer.notes,
      customer.createdAt.toISOString(),
    ]),
  );
}
