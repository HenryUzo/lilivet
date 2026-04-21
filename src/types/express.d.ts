declare namespace Express {
  export interface Request {
    uploadedFileIds?: string[];
    staffUser?: {
      id: string;
      email: string;
      role: import("@prisma/client").StaffRole;
    };
  }
}
