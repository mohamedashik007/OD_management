import express from 'express';
import { 
  getDepartmentApplications,
  getPendingMenteeApplications,
  approveStudentApplication,
  getStudentApplications
} from '../controller/staff.controller.js';
import { protectRoute, authorizeRoles } from '../middleware/protectRoute.js';

const router = express.Router();

// Apply to all routes
router.use(protectRoute, authorizeRoles('staff', 'hod', 'admin'));

// Get applications by department/class/semester
router.get('/department-applications', getDepartmentApplications);

// Get pending mentee applications
router.get('/mentee-applications', getPendingMenteeApplications);

// Approve/reject student application
router.post('/applications/:applicationId/students/:regno/approve', approveStudentApplication);

router.get('/student-applications', getStudentApplications);

export default router;