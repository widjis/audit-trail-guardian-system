import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Edit, Trash, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/services/settings-service";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableRowProps {
  grade: string;
  index: number;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
}

function SortableRow({
  grade,
  index,
  isEditing,
  editValue,
  onEditChange,
  onStartEdit,
  onSaveEdit,
  onRemove,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: grade });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-gray-100"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {index + 1}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSaveEdit();
              }
              if (e.key === "Escape") {
                onStartEdit(); // Reset editing state
              }
            }}
            autoFocus
          />
        ) : (
          grade
        )}
      </TableCell>
      <TableCell className="w-[150px]">
        {isEditing ? (
          <div className="flex space-x-2">
            <Button size="sm" onClick={onSaveEdit}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onStartEdit}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onStartEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={onRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export function PositionGradeSettings() {
  const [positionGrades, setPositionGrades] = useState<string[]>([]);
  const [newGrade, setNewGrade] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch settings from the server
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });

  // Update position grades when data is loaded
  useEffect(() => {
    if (data?.positionGrades) {
      setPositionGrades(data.positionGrades);
    }
  }, [data]);

  // Save position grades mutation
  const savePositionGradesMutation = useMutation({
    mutationFn: settingsService.updatePositionGrades,
    onSuccess: () => {
      toast.success("Position grades saved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to save position grades");
      console.error("Error saving position grades:", error);
    }
  });

  const handleAddGrade = () => {
    if (!newGrade.trim()) {
      toast.error("Position grade name is required");
      return;
    }

    if (positionGrades.some(grade => grade.toLowerCase() === newGrade.trim().toLowerCase())) {
      toast.error("This position grade already exists");
      return;
    }

    setPositionGrades([...positionGrades, newGrade.trim()]);
    setNewGrade("");
    toast.success("New position grade added");
  };

  const handleRemoveGrade = (index: number) => {
    const gradeToRemove = positionGrades[index];
    setPositionGrades(positionGrades.filter((_, i) => i !== index));
    toast.success(`Position grade "${gradeToRemove}" removed`);
  };

  const handleStartEdit = (index: number) => {
    if (editingIndex === index) {
      // Cancel editing
      setEditingIndex(null);
      setEditValue("");
    } else {
      // Start editing
      setEditingIndex(index);
      setEditValue(positionGrades[index]);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    if (!editValue.trim()) {
      toast.error("Position grade name is required");
      return;
    }

    const trimmedValue = editValue.trim();
    const existsAtDifferentIndex = positionGrades.some(
      (grade, index) => index !== editingIndex && grade.toLowerCase() === trimmedValue.toLowerCase()
    );

    if (existsAtDifferentIndex) {
      toast.error("This position grade already exists");
      return;
    }

    const updatedGrades = [...positionGrades];
    updatedGrades[editingIndex] = trimmedValue;
    setPositionGrades(updatedGrades);

    setEditingIndex(null);
    setEditValue("");
    toast.success("Position grade updated");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = positionGrades.indexOf(active.id as string);
      const newIndex = positionGrades.indexOf(over.id as string);

      setPositionGrades(arrayMove(positionGrades, oldIndex, newIndex));
      toast.success("Position grades reordered");
    }
  };

  const handleSaveChanges = () => {
    savePositionGradesMutation.mutate(positionGrades);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-red-500">Error loading settings. Please try again later.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Position Grade Settings</CardTitle>
        <CardDescription>
          Manage the list of position grades available for new hires. Drag and drop to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Available Position Grades</h3>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Position Grade</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={positionGrades}
                  strategy={verticalListSortingStrategy}
                >
                  {positionGrades.map((grade, index) => (
                    <SortableRow
                      key={grade}
                      grade={grade}
                      index={index}
                      isEditing={editingIndex === index}
                      editValue={editValue}
                      onEditChange={setEditValue}
                      onStartEdit={() => handleStartEdit(index)}
                      onSaveEdit={handleSaveEdit}
                      onRemove={() => handleRemoveGrade(index)}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>

          <div className="flex gap-4">
            <Input
              placeholder="Enter new position grade"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddGrade();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleAddGrade}
              disabled={!newGrade.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Position Grade
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSaveChanges}
          disabled={savePositionGradesMutation.isPending}
        >
          {savePositionGradesMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}