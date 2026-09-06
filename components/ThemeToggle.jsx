"use client";
// Icons import
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
// ShadCN imports
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ThemeToggle Component
export default function ThemeToggle() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu className="cursor-pointer">
            <DropdownMenuTrigger asChild>
                <Button className="cursor-pointer rounded-full" variant="outline" size="icon">
                    <Sun className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("light")}>
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("dark")}>
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme("system")}>
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
