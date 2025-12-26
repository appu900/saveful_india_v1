import { IsString } from "class-validator";





export class createIngrediantCategoryDto{
    @IsString()
    name:string;

    @IsString()
    description:string;
}