"use client";

import { Button } from "@/components/ui/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { CiWarning } from "react-icons/ci";

import CarouselComp from "./CarouselComp";

// shortlisted status now lives only on the applicant records themselves
// (owned by DataTable's baseData), instead of a separate parallel
// shortlistStatus array this component used to keep in sync by hand -
// that duplication was the reason toggling shortlist from inside "View
// Responses" never reflected back in the main table until a full reload.
// handleShortlist is DataTable's own optimistic handler, shared here so
// both views always agree.
export default function DialogComp({ selectedApplicants, handleShortlist }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">View Responses</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] h-fit">
                <DialogHeader>
                    <DialogTitle>Applicant&apos;s Responses</DialogTitle>
                    <DialogDescription>
                        Questions and answers answered by the applicants can be viewed here.
                    </DialogDescription>
                </DialogHeader>
                <div className="">
                    {selectedApplicants().length !== 0 ? (
                        <CarouselComp
                            dataList={selectedApplicants()}
                            handleShortlist={handleShortlist}
                        />
                    ) : (
                        <p className="flex gap-3 items-center justify-start font-light text-md text-red-500">
                            <CiWarning /> No applicant selected
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
