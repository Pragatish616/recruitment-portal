"use client";
import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FilterDepartment from "./FilterDepartment";
import FilterShortlisted from "./FilterShortlisted";
import { FaSortAmountDownAlt } from "react-icons/fa";
import { GrPowerReset } from "react-icons/gr";
import { Button } from "./ui/button";
import { CheckBoxComp } from "./CheckBoxComp";
import { toast } from "sonner";
import { curDate, curMonth, curYear, months } from "@/constants";
import { IoCloudDownloadOutline } from "react-icons/io5";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  useFilters,
  usePagination,
  useRowSelect,
} from "react-table";
import { Input } from "@/components/ui/input";
import PaginationComp from "./PaginationComp";
import DialogComp from "./DialogComp";
import { CSVLink } from "react-csv";
import { CSV_Header } from "@/constants";

// The compose-mail dialog pulls in the whole Tiptap editor stack (react,
// starter-kit, and 5 extension packages), which was previously a static
// import here despite the dialog being rendered but never wired to any
// button -- shipping Tiptap's full JS to every admin page load for a feature
// nobody could actually reach. Loading it lazily keeps that weight out of
// the admin route's initial bundle; it's only fetched once this table
// actually mounts, and only parsed/executed when the dialog is opened.
const MailComposer = dynamic(() => import("./MailComposer"), {
  ssr: false,
  loading: () => (
    <Button variant="outline" disabled>
      Custom Mail
    </Button>
  ),
});

const DataTable = ({ data }) => {
  const [tableData, setTableData] = useState(data);

  const [deptFiltered, setDeptFiltered] = useState(data);
  const [shortFiltered, setShortFiltered] = useState(data);

  const filterFunc = (dept) => {
    const filteredData = data.filter((row) => row.Department === dept);
    setDeptFiltered(filteredData);
  };

  const shortlistedFilterFunc = (status) => {
    const filteredData = data.filter((row) => String(row.shortlisted) === status);
    setShortFiltered(filteredData);
  };

  useEffect(() => {
    if (deptFiltered !== data && shortFiltered !== data) {
      const shortIds = new Set(shortFiltered.map((row) => row._id));
      setTableData(deptFiltered.filter((row) => shortIds.has(row._id)));
    } else if (deptFiltered !== data && shortFiltered === data) {
      setTableData(deptFiltered);
    } else if (deptFiltered === data && shortFiltered !== data) {
      setTableData(shortFiltered);
    } else {
      setTableData(data);
    }
  }, [data, deptFiltered, shortFiltered]);

  const applicantTotalCount = tableData.length;
  const shortlistedApplicantCount = useMemo(
    () => tableData.filter((item) => item.shortlisted).length,
    [tableData]
  );

  const handleShortlist = async (id, isShortlisted) => {
    try {
      const res = await fetch(`/api/shortlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: !isShortlisted }),
      });

      if (res.ok) {
        const updatedData = tableData.map((applicant) =>
          applicant._id === id ? { ...applicant, shortlisted: !isShortlisted } : applicant
        );
        setTableData(updatedData);
        toast.success("Student status updated!");
      } else {
        console.error("Failed to update applicant status.");
        throw new Error("Failed to update");
      }
    } catch (error) {
      console.error("Error occurred while updating the status:", error.message);
      toast.error("Failed to update status");
    }
  };

  const columns = useMemo(
    () => [
      {
        Header: "Sr No",
        accessor: (row, index) => index + 1,
      },
      {
        Header: "Name",
        accessor: "Name",
      },
      {
        Header: "RegistrationNumber",
        accessor: "RegistrationNumber",
      },
      {
        Header: "Email",
        accessor: "Email",
      },
      {
        Header: "Phone",
        accessor: "Phone",
      },
      {
        Header: "Department",
        accessor: "Department",
      },
      {
        Header: "Shortlisted",
        accessor: "shortlisted",
        Cell: ({ row }) => (
          <button
            onClick={() =>
              handleShortlist(row.original._id, row.original.shortlisted)
            }
            className={`px-4 py-2 rounded w-[115px] ${
              row.original.shortlisted
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {row.original.shortlisted ? "Unshortlist" : "Shortlist"}
          </button>
        ),
      },
    ],
    [tableData]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    state,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    selectedFlatRows,
  } = useTable(
    {
      columns,
      data: tableData,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => {
        return [
          {
            Header: ({ getToggleAllRowsSelectedProps }) => (
              <CheckBoxComp {...getToggleAllRowsSelectedProps()} />
            ),
            Cell: ({ row }) => (
              <CheckBoxComp {...row.getToggleRowSelectedProps()} />
            ),
          },
          ...columns,
        ];
      });
    }
  );

  const { globalFilter, pageIndex } = state;

  const handlePageSize = (e) => {
    const sz = Number(e.target.value);
    if (sz) {
      setPageSize(sz);
    } else {
      setPageSize(10);
    }
  };

  const handleRowSelection = async (payloadData) => {
    const selectedApplicants = selectedFlatRows.map((row) => row.original);
    const request = {
      recipients: selectedApplicants,
      payloadData: payloadData,
    };

    try {
      // const response = await MailSender(request);
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        toast("Invite has been sent!", {
          description: `On ${months[curMonth - 1]} ${curDate}, ${curYear}`,
        });
      } else {
        toast("Failed to send invite", {
          description: "Please try again later.",
        });
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast("Failed to send invite", {
        description: "Please try again later.",
      });
    }
  };

  const showRowData = () => {
    const selectedApplicants = selectedFlatRows.map((row) => row.original);
    return selectedApplicants;
  };

  const formatQuestionsForCsv = (item) => {
    if (!item?.Questions) return "";

    if (Array.isArray(item.Questions)) {
      return item.Questions
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (Array.isArray(entry)) return entry.join(": ");
          if (entry && typeof entry === "object") {
            return Object.entries(entry)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ");
          }
          return String(entry ?? "");
        })
        .join(" | ");
    }

    if (typeof item.Questions === "object") {
      return Object.entries(item.Questions)
        .map(([question, answer]) => `${question}: ${answer}`)
        .join(" | ");
    }

    return String(item.Questions);
  };

  const csv_link = {
    headers: CSV_Header,
    data: tableData.map((item) => ({
      ...item,
      Questions: formatQuestionsForCsv(item),
    })),
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 px-2 pt-1 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{applicantTotalCount}</span> applicants
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="font-medium text-foreground">{shortlistedApplicantCount}</span> shortlisted
        </span>
      </div>
      <div className="flex items-start border-none justify-start gap-3 p-1 overflow-x-auto">
        <Input
          value={globalFilter || ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filter Data"
          className="min-w-[300px]"
        />
        <Input
          className="w-fit"
          onChange={(e) => handlePageSize(e)}
          placeholder={"Page Size"}
        />
        <FilterDepartment filterFunc={filterFunc} />
        <FilterShortlisted filterFunc={shortlistedFilterFunc} />
        <DialogComp selectedApplicants={showRowData} />
        <MailComposer recipients={selectedFlatRows.length} handleRowSelection={handleRowSelection} />
        <Button onClick={() => window.location.reload()} className="flex gap-2">
          <GrPowerReset />
          Reset Filters
        </Button>
        <Button>
          <CSVLink
            {...csv_link}
            className="flex gap-2 justify-center items-center"
          >
            <IoCloudDownloadOutline />
            Download CSV
          </CSVLink>
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table {...getTableProps()}>
          <TableHeader>
            {headerGroups.map((hg) => (
              <TableRow key={hg.id} {...hg.getHeaderGroupProps()}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    {...header.getHeaderProps(header.getSortByToggleProps())}
                  >
                    <div className="inline-flex cursor-pointer items-center gap-1 select-none">
                      {header.render("Header")}
                      <FaSortAmountDownAlt className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody {...getTableBodyProps()}>
            {page.map((row) => {
              prepareRow(row);
              return (
                <TableRow key={row.id} {...row.getRowProps()}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.column.id} {...cell.getCellProps()}>
                      {cell.render("Cell")}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationComp
        pageIndex={pageIndex}
        pages={pageOptions.length}
        nextPage={nextPage}
        canNext={canNextPage}
        previousPage={previousPage}
        canPrev={canPreviousPage}
        goto={gotoPage}
        pageCount={pageCount}
      />
    </div>
  );
};

export default DataTable;
