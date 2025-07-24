import { useForm } from "react-hook-form"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { Button } from "@/components/ui/button"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { Settings2 } from "lucide-react";

function UnitsForm({ onClose }: { onClose: () => void }) {
  const [units, setUnits] = useState(() => localStorage.getItem("units") || "metric"); // Default to metric units

  useEffect(() => {
    localStorage.setItem("units", units);
  }, [units]);

  const form = useForm({
    defaultValues: {
      units: {units},
    },
  })

  function onSubmit() {
    console.log("Selected units:", units);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="">
        <FormField
          control={form.control}
          name="units"
          render={({ field }) => (
            <FormItem className="gap-4">
              <FormLabel>Global units settings</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    setUnits(value);
                    field.onChange(value);
                  }}
                  value={units}
                >
                  <div className="flex space-x-4">
                    <RadioGroupItem value="metric" id="metric" />
                    <Label htmlFor="metric">Metric</Label>
                    <RadioGroupItem value="imperial" id="imperial" />
                    <Label htmlFor="imperial">Imperial</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription></FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex w-full shrink flex-col justify-center gap-2 sm:flex-row">
          <Button
            type="submit"
            className="w-full shrink cursor-pointer"
            onClick={() => {
              onClose();
              localStorage.setItem("units", units);
              window.dispatchEvent(new Event("unitsChanged"));
          }}
          >
            Save
          </Button>
          <Button
            type="reset"
            variant="outline"
            className="w-full shrink cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default function UnitsDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title="Unit Settings">
          <Icon icon={Settings2} className="size-5!" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unit Settings</DialogTitle>
          <DialogDescription>
            Choose units of measurement
          </DialogDescription>
        </DialogHeader>
        <UnitsForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}