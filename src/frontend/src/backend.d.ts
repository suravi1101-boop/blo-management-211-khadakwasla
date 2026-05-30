import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PasswordHistoryEntry {
    action: string;
    maskedPassword: string;
    changedBy: string;
    constituencyId: string;
    note: string;
    role: string;
    timestamp: bigint;
    identifier: string;
}
export interface AppointmentDateChange {
    id: string;
    constituencyId: string;
    createdAt: bigint;
    bloId: string;
    newDate: bigint;
    oldDate: bigint;
    reason: string;
}
export interface OrderSettings {
    orderOfficerTehsil: string;
    constituencyId: string;
    orderHeaderPhone: string;
    orderOfficerConstituency: string;
    updatedAt: bigint;
    orderOfficerDesignation: string;
    orderOfficerName: string;
    orderHeaderEmail: string;
    orderHeaderLine1: string;
    orderHeaderLine2: string;
}
export interface HonorariumEligibilityResult {
    isEligible: boolean;
    partNumber: string;
    bloName: string;
    exclusionReason?: string;
    bloId: string;
    isManuallyOverridden: boolean;
}
export interface Supervisor {
    id: string;
    constituencyId: string;
    password?: string;
    name: string;
    designation: string;
    createdAt: bigint;
    isActive: boolean;
    loginAttempts: bigint;
    updatedAt: bigint;
    assignedStationIds: Array<string>;
    isLocked: boolean;
    phone: string;
}
export interface PollingStation {
    id: string;
    latitude?: number;
    partNumber: string;
    constituencyId: string;
    createdAt: bigint;
    partName: string;
    updatedAt: bigint;
    longitude?: number;
    bloId?: string;
    location: string;
    assignedSupervisorId?: string;
}
export interface HonorariumRecord {
    id: string;
    status: string;
    constituencyId: string;
    approvedAt?: bigint;
    approvedBy?: string;
    quarter: string;
    note?: string;
    createdAt: bigint;
    bloId: string;
    amount: bigint;
    paidAt?: bigint;
    supervisorId?: string;
}
export interface NodalOfficer {
    id: string;
    assignedSupervisorIds: Array<string>;
    constituencyId: string;
    password?: string;
    name: string;
    designation: string;
    createdAt: bigint;
    mobileNumber?: string;
    isActive: boolean;
    loginAttempts: bigint;
    updatedAt: bigint;
    isLocked: boolean;
    phone: string;
}
export interface HonorariumSummary {
    total: bigint;
    constituencyId: string;
    totalPaid: bigint;
    totalApproved: bigint;
    totalPending: bigint;
}
export interface HonorariumConfig {
    constituencyId: string;
    currency: string;
    baseAmount: bigint;
    effectiveFrom: bigint;
}
export interface QuarterlyPayment {
    id: string;
    status: string;
    constituencyId: string;
    quarter: string;
    createdAt: bigint;
    bloId: string;
    amount: bigint;
    paidAt?: bigint;
}
export interface GPSTrackingRecord {
    assignedBLOName?: string;
    pollingStationId: string;
    partNumber: string;
    constituencyId: string;
    partName: string;
    gpsUpdatedAt?: bigint;
    gpsUpdatedBy?: string;
    assignedNodalOfficerName?: string;
    assignedSupervisorName?: string;
    gpsUpdatedByName?: string;
    assignedBLOPhone?: string;
    gpsUpdatedByRole?: string;
    assignedNodalOfficerId?: string;
    assignedBLOId?: string;
    location: string;
    assignedSupervisorId?: string;
    gpsLat?: number;
    gpsLon?: number;
}
export interface BankDetails {
    ifscCode: string;
    bankName: string;
    accountNumber: string;
    branchName: string;
}
export interface HonorariumDistribution {
    id: string;
    constituencyId: string;
    quarter: string;
    note: string;
    createdAt: bigint;
    createdBy: string;
    year: string;
    baseAmount: bigint;
}
export interface BLO {
    id: string;
    status: string;
    appointmentOrderId?: string;
    bankAccount?: string;
    partNumber: string;
    officeAddress?: string;
    constituencyId: string;
    name: string;
    designation: string;
    createdAt: bigint;
    partName: string;
    aadhaar?: string;
    email?: string;
    updatedAt: bigint;
    voterId?: string;
    phone: string;
    isExcellent: boolean;
}
export interface NoticeSettings {
    noticeOfficerDesignation: string;
    noticeOfficerName: string;
    noticeOfficerTehsil: string;
    constituencyId: string;
    noticeHeaderEmail: string;
    noticeHeaderLine1: string;
    noticeHeaderLine2: string;
    updatedAt: bigint;
    noticeHeaderPhone: string;
    noticeOfficerConstituency: string;
}
export interface ExtraPayment {
    id: string;
    status: string;
    partNumber?: string;
    bloName?: string;
    constituencyId: string;
    createdAt: bigint;
    bloId: string;
    amount: bigint;
    reason: string;
}
export interface ConstituencyConfig {
    id: string;
    name: string;
    passwordChangedAt: bigint;
    loginAttempts: bigint;
    isEnabled: boolean;
    updatedAt: bigint;
    adminPassword: string;
    lockedUntil?: bigint;
}
export interface AppointmentOrder {
    id: string;
    status: string;
    content: string;
    constituencyId: string;
    createdAt: bigint;
    issuedDate: bigint;
    bloId: string;
    orderNumber: string;
}
export interface Notice {
    id: string;
    noticeType: string;
    status: string;
    content: string;
    noticeNumber: string;
    subject: string;
    constituencyId: string;
    createdAt: bigint;
    createdById: string;
    clearedByName?: string;
    issuedDate: bigint;
    clearedById?: string;
    updatedAt: bigint;
    createdByName: string;
    createdByRole: string;
    noticeRecipients: Array<NoticeRecipientStatus>;
    printHistory: Array<PrintRecord>;
    clearedAt?: bigint;
    recipientType: string;
    recipientId: string;
    clearedForHonorarium: boolean;
    issuingAuthority: string;
}
export interface GPSLocation {
    lat: number;
    lon: number;
    pollingStationId: string;
    constituencyId: string;
    updatedByName: string;
    updatedByRole: string;
    updatedAt: bigint;
    updatedBy: string;
}
export interface AavakJavakEntry {
    id: string;
    documentType: string;
    entryType: string;
    referenceNumber: string;
    date: bigint;
    createdBy: string;
    description: string;
    linkedDocId?: string;
    constituency: string;
    fromTo: string;
}
export interface OfficialDocumentMeta {
    id: string;
    name: string;
    constituency: string;
    category: string;
    uploadDate: bigint;
    uploadedBy: string;
    fileKey: string;
}
export interface PrintRecord {
    printedAt: bigint;
    printedBy: string;
    printedByName: string;
}
export interface SupervisorHonorariumRequest {
    id: string;
    status: string;
    supervisorName: string;
    constituencyId: string;
    quarter: string;
    year: string;
    bloIds: Array<string>;
    supervisorId: string;
    requestedAt: bigint;
}
export interface NoticeRecipientStatus {
    deliveredAt?: bigint;
    deliveryStatus: string;
    recipientType: string;
    recipientId: string;
    readAt?: bigint;
}
export interface backendInterface {
    addAavakJavakEntry(entry: AavakJavakEntry): Promise<{
        __kind__: "ok";
        ok: AavakJavakEntry;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addAppointmentDateChange(constituencyId: string, change: AppointmentDateChange): Promise<void>;
    addConstituency(cid: string, cname: string, adminPassword: string): Promise<boolean>;
    addExtraPayment(constituencyId: string, payment: ExtraPayment): Promise<void>;
    addNoticePrintRecord(constituencyId: string, noticeId: string, printedBy: string, printedByName: string): Promise<Notice | null>;
    addOfficialDocMeta(meta: OfficialDocumentMeta): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addPollingStation(station: PollingStation): Promise<boolean>;
    addQuarterlyPayment(constituencyId: string, payment: QuarterlyPayment): Promise<void>;
    addSupervisorQuarterlyPayment(constituencyId: string, payment: QuarterlyPayment): Promise<void>;
    adminLogin(cid: string, password: string): Promise<boolean>;
    approveHonorarium(recordId: string, approvedById: string): Promise<boolean>;
    bulkSaveBLOs(cid: string, blos: Array<BLO>): Promise<bigint>;
    bulkSaveGPSLocations(cid: string, locations: Array<GPSLocation>): Promise<boolean>;
    bulkSaveNotices(constituencyId: string, notices: Array<Notice>): Promise<boolean>;
    bulkSavePollingStations(cid: string, stations: Array<PollingStation>): Promise<bigint>;
    changeAdminPassword(cid: string, currentPassword: string, newPassword: string, changedBy: string): Promise<boolean>;
    changeNodalOfficerPassword(cid: string, officerId: string, currentPassword: string, newPassword: string): Promise<boolean>;
    changeSuperAdminPassword(currentPassword: string, newPassword: string): Promise<boolean>;
    changeSupervisorPassword(cid: string, supervisorId: string, currentPassword: string, newPassword: string): Promise<boolean>;
    clearNoticeForHonorarium(noticeId: string, clearedById: string, clearedByName: string): Promise<boolean>;
    createAppointmentOrder(cid: string, bloId: string, content: string): Promise<AppointmentOrder>;
    createHonorariumRecord(record: HonorariumRecord): Promise<boolean>;
    createSupervisorHonorariumRequest(request: SupervisorHonorariumRequest): Promise<boolean>;
    deleteAavakJavakEntry(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteBLO(bloId: string): Promise<boolean>;
    deleteBLOsByConstituency(constituencyId: string): Promise<boolean>;
    deleteNodalOfficer(cid: string, officerId: string): Promise<boolean>;
    deleteNotice(constituencyId: string, noticeId: string): Promise<boolean>;
    deleteOfficialDocMeta(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deletePollingStation(stationId: string): Promise<boolean>;
    deleteSupervisor(cid: string, supervisorId: string): Promise<boolean>;
    disableAllConstituencies(): Promise<boolean>;
    enableAllConstituencies(): Promise<boolean>;
    getAavakJavakEntries(constituency: string): Promise<Array<AavakJavakEntry>>;
    getAllConstituencyConfigs(): Promise<Array<ConstituencyConfig>>;
    getAllGPSLocations(): Promise<Array<GPSLocation>>;
    getAppointmentDateChanges(constituencyId: string): Promise<Array<AppointmentDateChange>>;
    getAppointmentDateChangesFresh(constituencyId: string): Promise<Array<AppointmentDateChange>>;
    getAppointmentOrders(cid: string): Promise<Array<AppointmentOrder>>;
    getBLOBankDetails(constituencyId: string, bloId: string): Promise<BankDetails | null>;
    getBLOs(cid: string): Promise<Array<BLO>>;
    getBLOsBySupervisor(cid: string, supervisorId: string): Promise<Array<BLO>>;
    getConstituencyById(cid: string): Promise<ConstituencyConfig | null>;
    getConstituencyConfig(): Promise<ConstituencyConfig | null>;
    /**
     * / Return the full deletion history log
     */
    getDeleteHistory(): Promise<Array<[string, string, string, string, bigint]>>;
    getEligibleBLOsForHonorarium(constituencyId: string): Promise<Array<BLO>>;
    getExtraPayments(constituencyId: string): Promise<Array<ExtraPayment>>;
    getExtraPaymentsByConstituency(constituencyId: string): Promise<Array<ExtraPayment>>;
    getExtraPaymentsFresh(constituencyId: string): Promise<Array<ExtraPayment>>;
    getGPSLocationsFresh(cid: string): Promise<Array<GPSLocation>>;
    getGPSTrackingInfo(cid: string): Promise<Array<GPSTrackingRecord>>;
    getHonorariumByBLO(bloId: string): Promise<Array<HonorariumRecord>>;
    getHonorariumByConstituency(constituencyId: string): Promise<Array<HonorariumRecord>>;
    getHonorariumByConstituencyFresh(constituencyId: string): Promise<Array<HonorariumRecord>>;
    getHonorariumBySupervisor(supervisorId: string): Promise<Array<HonorariumRecord>>;
    getHonorariumConfig(constituencyId: string): Promise<HonorariumConfig | null>;
    getHonorariumDistributions(constituencyId: string): Promise<Array<HonorariumDistribution>>;
    getHonorariumEligibility(constituencyId: string): Promise<Array<HonorariumEligibilityResult>>;
    getHonorariumSummary(constituencyId: string): Promise<HonorariumSummary>;
    /**
     * / Returns the NEXT outward counter number for a constituency WITHOUT incrementing.
     * / Use this to preview the reference number before saving the order.
     */
    getNextOutwardCounter(constituencyId: string): Promise<bigint>;
    getNodalOfficerBLOs(nodalOfficerId: string, cid: string): Promise<Array<Supervisor>>;
    getNodalOfficerSupervisors(nodalOfficerId: string, cid: string): Promise<Array<Supervisor>>;
    getNodalOfficers(cid: string): Promise<Array<NodalOfficer>>;
    getNoticeDeliveryReport(constituencyId: string, noticeId: string): Promise<Array<NoticeRecipientStatus>>;
    getNoticeSettings(constituencyId: string): Promise<NoticeSettings | null>;
    getNotices(constituencyId: string): Promise<Array<Notice>>;
    getNoticesByCreator(constituencyId: string, creatorId: string, creatorRole: string): Promise<Array<Notice>>;
    getNoticesByRecipient(constituencyId: string, recipientId: string, recipientType: string): Promise<Array<Notice>>;
    getNoticesForDashboard(constituencyId: string, viewerRole: string, viewerId: string): Promise<Array<Notice>>;
    getNoticesForNodalOfficer(constituencyId: string, nodalOfficerId: string, assignedSupervisorIds: Array<string>, supervisorBloIds: Array<string>): Promise<Array<Notice>>;
    getNoticesForNodalOfficerFresh(constituencyId: string, nodalOfficerId: string, assignedSupervisorIds: Array<string>, supervisorBloIds: Array<string>): Promise<Array<Notice>>;
    getNoticesForSupervisor(constituencyId: string, supervisorId: string, assignedBloIds: Array<string>): Promise<Array<Notice>>;
    getNoticesForSupervisorFresh(constituencyId: string, supervisorId: string, assignedBloIds: Array<string>): Promise<Array<Notice>>;
    getNoticesFresh(constituencyId: string): Promise<Array<Notice>>;
    getOfficialDocMetas(constituency: string): Promise<Array<OfficialDocumentMeta>>;
    getOrderSettings(constituencyId: string): Promise<OrderSettings | null>;
    getPasswordHistory(cid: string): Promise<Array<PasswordHistoryEntry>>;
    getPollingStationGPS(cid: string, stationId: string): Promise<[number, number] | null>;
    getPollingStations(cid: string): Promise<Array<PollingStation>>;
    getQuarterlyPayments(constituencyId: string): Promise<Array<QuarterlyPayment>>;
    getSupervisorBankDetails(constituencyId: string, supervisorId: string): Promise<BankDetails | null>;
    getSupervisorHonorariumConfig(constituencyId: string): Promise<HonorariumConfig | null>;
    getSupervisorHonorariumRequests(constituencyId: string): Promise<Array<SupervisorHonorariumRequest>>;
    getSupervisorHonorariumRequestsBySupervisor(supervisorId: string): Promise<Array<SupervisorHonorariumRequest>>;
    getSupervisorQuarterlyPayments(constituencyId: string): Promise<Array<QuarterlyPayment>>;
    getSupervisors(cid: string): Promise<Array<Supervisor>>;
    /**
     * / Simple health check — confirms canister is live
     */
    healthCheck(): Promise<string>;
    /**
     * / Increments the outward counter for a constituency and returns the new value.
     * / Call this when the order is actually saved/issued.
     */
    incrementOutwardCounter(constituencyId: string): Promise<bigint>;
    issueNotice(constituencyId: string, notice: Notice): Promise<Notice>;
    markHonorariumPaid(recordId: string): Promise<boolean>;
    nodalOfficerLogin(cid: string, phone: string, password: string): Promise<NodalOfficer | null>;
    /**
     * / Record a deletion event (type, name, deletedBy, reason) with current timestamp
     */
    recordDeletion(recordType: string, recordName: string, deletedBy: string, reason: string): Promise<void>;
    recordPasswordChange(cid: string, role: string, identifier: string, changedBy: string, note: string): Promise<boolean>;
    restoreHonorariumEligibility(constituencyId: string, bloId: string, clearedBy: string | null): Promise<boolean>;
    saveBLO(blo: BLO): Promise<boolean>;
    saveGPSLocation(cid: string, location: GPSLocation): Promise<boolean>;
    saveNodalOfficer(officer: NodalOfficer): Promise<boolean>;
    saveNotice(constituencyId: string, notice: Notice): Promise<boolean>;
    saveNoticeSettings(settings: NoticeSettings): Promise<boolean>;
    saveOrderSettings(settings: OrderSettings): Promise<boolean>;
    saveSupervisor(supervisor: Supervisor): Promise<boolean>;
    setBLOBankDetails(constituencyId: string, bloId: string, details: BankDetails): Promise<void>;
    setConstituencyAdminPassword(cid: string, newPassword: string, changedBy: string): Promise<boolean>;
    setConstituencyEnabled(cid: string, enabled: boolean): Promise<boolean>;
    setHonorariumConfig(constituencyId: string, config: HonorariumConfig): Promise<void>;
    setHonorariumDistribution(dist: HonorariumDistribution): Promise<boolean>;
    setHonorariumExcludeOverride(constituencyId: string, bloId: string, isManuallyIncluded: boolean, reason: string | null, overriddenBy: string | null): Promise<boolean>;
    setPollingStationGPS(cid: string, stationId: string, lat: number, lon: number): Promise<boolean>;
    setSupervisorBankDetails(constituencyId: string, supervisorId: string, details: BankDetails): Promise<void>;
    setSupervisorHonorariumConfig(constituencyId: string, config: HonorariumConfig): Promise<void>;
    superAdminLogin(password: string): Promise<boolean>;
    supervisorLogin(cid: string, phone: string, password: string): Promise<Supervisor | null>;
    updateAppointmentOrder(order: AppointmentOrder): Promise<boolean>;
    updateBLO(blo: BLO): Promise<boolean>;
    updateNodalOfficer(officer: NodalOfficer): Promise<boolean>;
    updateNotice(constituencyId: string, notice: Notice): Promise<boolean>;
    updateNoticeDeliveryStatus(constituencyId: string, noticeId: string, recipientId: string, recipientType: string, newStatus: string): Promise<boolean>;
    updateNoticeRecipientStatus(noticeId: string, recipientId: string, newStatus: string, recipientType: string): Promise<boolean>;
    updatePollingStation(station: PollingStation): Promise<boolean>;
    updateQuarterlyPayment(constituencyId: string, payment: QuarterlyPayment): Promise<void>;
    updateSupervisor(supervisor: Supervisor): Promise<boolean>;
    updateSupervisorQuarterlyPayment(constituencyId: string, payment: QuarterlyPayment): Promise<void>;
}
