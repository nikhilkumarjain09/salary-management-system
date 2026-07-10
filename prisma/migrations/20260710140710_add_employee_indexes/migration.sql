-- CreateIndex
CREATE INDEX "Employee_name_idx" ON "Employee"("name");

-- CreateIndex
CREATE INDEX "Employee_startDate_idx" ON "Employee"("startDate");

-- CreateIndex
CREATE INDEX "Employee_isActive_department_level_country_idx" ON "Employee"("isActive", "department", "level", "country");
