"use client";

import { useState } from "react";
import { Search, UserCheck, X, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Student {
  id: string;
  name: string;
  weeklyLimit: number;
  weeklySpending: number;
}

interface StudentSelectorProps {
  students: Student[];
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  onClearStudent: () => void;
}

export function StudentSelector({ students, selectedStudent, onSelectStudent, onClearStudent }: StudentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredStudents = searchTerm.length > 1 
    ? students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const handleSimulateScan = () => {
    // Simulate scanning a random student
    if (students.length > 0) {
      onSelectStudent(students[Math.floor(Math.random() * students.length)]);
      setSearchTerm("");
    }
  };

  return (
    <div className="space-y-4">
      {!selectedStudent ? (
        <div className="space-y-4">
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Öğrenci Adı ile Ara..." 
                className="pl-10 h-14 text-lg rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="h-14 px-6 rounded-xl border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={handleSimulateScan}
            >
              <QrCode className="h-6 w-6" />
            </Button>
          </div>

          {filteredStudents.length > 0 && (
            <Card className="absolute z-10 w-full max-w-[calc(100%-4rem)] shadow-xl">
              <CardContent className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {filteredStudents.map(student => (
                  <Button 
                    key={student.id} 
                    variant="ghost" 
                    className="w-full justify-start h-14 text-lg font-medium"
                    onClick={() => {
                      onSelectStudent(student);
                      setSearchTerm("");
                    }}
                  >
                    <UserCheck className="mr-3 h-5 w-5 text-muted-foreground" />
                    {student.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl leading-none">{selectedStudent.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-background text-sm">
                    Limit: ₺{selectedStudent.weeklyLimit.toFixed(2)}
                  </Badge>
                  <Badge variant={selectedStudent.weeklySpending >= selectedStudent.weeklyLimit ? "destructive" : "secondary"} className="text-sm">
                    Harcanan: ₺{selectedStudent.weeklySpending.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClearStudent} className="h-12 w-12 rounded-full hover:bg-destructive/10 hover:text-destructive">
              <X className="h-6 w-6" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
