"use client";
import React, { useState, useMemo } from "react";
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
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";
import { curDate, curMonth, curYear, months } from "@/constants";
import { IoCloudDownloadOutline } from "react-icons/io5";
import { RefreshCw } from "lucide-react";
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
  // baseData is this component's single source of truth for applicant
  // records (initially the server-rendered list, replaceable by Refresh
  // below or by an optimistic shortlist toggle). tableData is always
  // *derived* from it plus whatever filters are active - previously this
  // was tracked as separate state kept in sync by a useEffect that detected
  // "is a filter active" via `deptFiltered !== data` reference-equality.
  // That broke the moment the underlying array needed to change for any
  // other reason (an optimistic update, a refresh): the filter state's
  // stale reference would suddenly look "active" against the new array
  // even though the user never touched a filter, silently reverting the
  // table to old filtered data. Deriving tableData with useMemo from
  // explicit filter values removes that whole class of bug.
  const [baseData, setBaseData] = useState(data);
  const [deptFilterValue, setDeptFilterValue] = useState("");
  const [shortFilterValue, setShortFilterValue] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // FilterDepartment/FilterShortlisted each keep their own "currently
  // selected" label internally. A full window.location.reload() used to
  // wipe that along with everything else, which is the only reason the
  // old reset button never looked broken. Bumping this and passing it down
  // as a resetKey tells them to clear their own displayed selection too.
  const [filterResetKey, setFilterResetKey] = useState(0);

  const filterFunc = (dept) => setDeptFilterValue(dept);
  const shortlistedFilterFunc = (status) => setShortFilterValue(status);

  const tableData = useMemo(() => {
    let result = baseData;
    if (deptFilterValue) result = result.filter((row) => row.Department === deptFilterValue);
    if (shortFilterValue) result = result.filter((row) => String(row.shortlisted) === shortFilterValue);
    return result;
  }, [baseData, deptFilterValue, shortFilterValue]);

  const applicantTotalCount = tableData.length;
  const shortlistedApplicantCount = useMemo(
    () => tableData.filter((item) => item.shortlisted).length,
    [tableData]
  );

  // Optimistic: flip the row immediately so the admin sees an instant
  // response (both here and in the "View Responses" dialog, which now
  // shares this same handler instead of keeping its own separate copy of
  // shortlisted status), then roll back with a toast if the server
  // actually rejects it.
  const handleShortlist = async (id, isShortlisted) => {
    setBaseData((prev) =>
      prev.map((applicant) =>
        applicant._id === id ? { ...applicant, shortlisted: !isShortlisted } : applicant
      )
    );

    try {
      const res = await fetch(`/api/shortlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: !isShortlisted }),
      });

      if (!res.ok) throw new Error("Failed to update");
      toast.success("Student status updated!");
    } catch (error) {
      setBaseData((prev) =>
        prev.map((applicant) =>
          applicant._id === id ? { ...applicant, shortlisted: isShortlisted } : applicant
        )
      );
      console.error("Error occurred while updating the status:", error.message);
      toast.error("Failed to update status");
    }
  };

  const handleResetFilters = () => {
    setDeptFilterValue("");
    setShortFilterValue("");
    setGlobalFilter("");
    setFilterResetKey((key) => key + 1);
  };

  // /api/admin/applicants already existed (server-gated the same way the
  // page itself is) but nothing ever called it - the only way to see fresh
  // data was a full window.location.reload(). This wires it up as an
  // actual client-side refetch instead, so refreshing doesn't blank the
  // whole page or lose your current filters/pagination.
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/applicants");
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.applicants)) throw new Error("Failed to refresh");
      setBaseData(json.applicants);
      toast.success("Applicant list refreshed");
    } catch (error) {
      console.error("Failed to refresh applicants:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
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
        <FilterDepartment filterFunc={filterFunc} resetKey={filterResetKey} />
        <FilterShortlisted filterFunc={shortlistedFilterFunc} resetKey={filterResetKey} />
        <DialogComp selectedApplicants={showRowData} handleShortlist={handleShortlist} />
        <MailComposer recipients={selectedFlatRows.length} handleRowSelection={handleRowSelection} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleResetFilters} className="flex gap-2">
              <GrPowerReset />
              Reset Filters
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clears search, department, and shortlisted filters</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              variant="outline"
              className="flex gap-2"
            >
              <RefreshCw className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reload the applicant list from the server</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>
              <CSVLink
                {...csv_link}
                className="flex gap-2 justify-center items-center"
              >
                <IoCloudDownloadOutline />
                Download CSV
              </CSVLink>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export every applicant currently in the table (respects active filters)</TooltipContent>
        </Tooltip>
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
            {isRefreshing
              ? Array.from({ length: Math.min(page.length || 5, 8) }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {(headerGroups[0]?.headers || []).map((header) => (
                      <TableCell key={header.id}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : page.map((row) => {
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
