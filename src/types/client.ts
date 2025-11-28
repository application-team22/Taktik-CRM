export type ClientStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Interested'
  | 'Not Interested'
  | 'Booked';

export interface Client {
  id: string;
  name: string;
  phone_number: string;
  destination: string;
  status: ClientStatus;
  price: number;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface ClientFormData {
  name: string;
  phone_number: string;
  destination: string;
  status: ClientStatus;
  price: number;
  country: string;
}
