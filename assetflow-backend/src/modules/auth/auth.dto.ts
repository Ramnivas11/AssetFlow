
export interface AuthTokensDTO {
    accessToken: string;
    refreshToken: string;
}

export interface UserResponseDTO {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "ASSET_MANAGER" | "DEPARTMENT_HEAD" | "EMPLOYEE";
    departmentId: string | null;
}
