import { IsEmail, IsString, MinLength, MaxLength, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsIn([
    'ADMIN', 'TEACHER', 'STUDENT', 'PARENT',
    'OFFICER', 'STAFF', 'OFFICE_HEAD', 'DEPUTY_OFFICE_HEAD',
    'DEPARTMENT_HEAD', 'DEPUTY_DEPARTMENT_HEAD',
    'GENERAL_DEPARTMENT_DIRECTOR', 'DEPUTY_GENERAL_DEPARTMENT_DIRECTOR',
    'COMPANY_CEO', 'CREDIT_OFFICER', 'SECURITY_GUARD', 'JANITOR',
    'PROJECT_MANAGER', 'BRANCH_MANAGER', 'EXECUTIVE_DIRECTOR', 'HR_MANAGER',
    'ATHLETE_MALE', 'ATHLETE_FEMALE', 'TRAINER', 'BARISTA', 'CASHIER',
    'RECEPTIONIST', 'GENERAL_MANAGER',
    'PRIMARY_SCHOOL_PRINCIPAL', 'SECONDARY_SCHOOL_PRINCIPAL',
    'HIGH_SCHOOL_PRINCIPAL', 'UNIVERSITY_RECTOR',
  ])
  role: string;
}
