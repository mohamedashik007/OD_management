import pool from "../config/db.js";

export const createApplication = async (req, res) => {
  try {
    const { event_name, from_date, to_date, type, students } = req.body;
    const studentRegno = req.user.user_id; // From JWT

    // Create application
    const [application] = await pool.query(
      `INSERT INTO applications 
      (event_name, from_date, to_date, type, applied_by, dep_id, academic_term_id)
      SELECT ?, ?, ?, ?, ?, dep_id, academic_term_id
      FROM students WHERE regno = ?`,
      [event_name, from_date, to_date, type, studentRegno, studentRegno]
    );

    // Add students to application (creator auto-approved)
    const applicationStudents = students.map(regno => [
      application.insertId,
      regno,
      'pending'
    ]);

    await pool.query(
      `INSERT INTO application_students 
      (application_id, regno, mentor_approval_status)
      VALUES ?`,
      [applicationStudents]
    );

    res.status(201).json({ 
      message: 'Application created successfully',
      applicationId: application.insertId
    });
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteApplication = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { applicationId } = req.params;
    const studentRegno = req.user.user_id;

    // 1. Verify application ownership
    const [application] = await connection.query(
      `SELECT id FROM applications 
       WHERE id = ? AND applied_by = ?`,
      [applicationId, studentRegno]
    );

    if (application.length === 0) {
      return res.status(404).json({ error: 'Application not found or unauthorized' });
    }

    // 2. Delete application students first
    await connection.query(
      `DELETE FROM application_students 
       WHERE application_id = ?`,
      [applicationId]
    );

    // 3. Delete the application
    await connection.query(
      `DELETE FROM applications 
       WHERE id = ?`,
      [applicationId]
    );

    await connection.commit();
    res.status(200).json({ message: 'Application deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};

export const searchStudents = async (req, res) => {
  try {
    const { regno } = req.query;
    
    const [students] = await pool.query(
      `SELECT regno, name, section 
      FROM students 
      WHERE regno LIKE ? 
      LIMIT 10`,
      [`%${regno}%`]
    );

    res.status(200).json(students);
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getApplicationStatus = async (req, res) => {
  try {
    const studentRegno = req.user.user_id;

    const [applications] = await pool.query(
      `SELECT 
        a.id, 
        a.event_name, 
        a.from_date, 
        a.to_date, 
        a.type,
        a.status,
        a.hod_approval_status,
        ast.mentor_approval_status
      FROM applications a
      JOIN application_students ast ON a.id = ast.application_id
      WHERE ast.regno = ?`,
      [studentRegno]
    );

    res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getApplicationActivities = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const studentRegno = req.user.user_id;

    const [activities] = await pool.query(
      `SELECT 
        a.id,
        a.event_name,
        a.applied_date,
        a.status,
        a.hod_approval_status,
        d.name AS department,
        at.name AS academic_term,
        ast.mentor_approval_status,
        ast.mentor_approval_date,
        ast.mentor_comment
      FROM applications a
      JOIN application_students ast ON a.id = ast.application_id
      JOIN departments d ON a.dep_id = d.id
      JOIN academic_terms at ON a.academic_term_id = at.id
      WHERE a.id = ? AND ast.regno = ?`,
      [applicationId, studentRegno]
    );

    if (activities.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.status(200).json(activities[0]);
  } catch (error) {
    console.error('Error fetching application activities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteApplicationStudent = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { applicationId, regno } = req.params;
    const studentRegno = req.user.user_id;

    // 1. Verify ownership and check HOD approval status
    const [application] = await connection.query(
      `SELECT a.applied_by, a.hod_approval_status 
       FROM applications a
       WHERE a.id = ? AND a.applied_by = ?`,
      [applicationId, studentRegno]
    );

    if (application.length === 0) {
      return res.status(404).json({ 
        error: 'Application not found or unauthorized' 
      });
    }

    // 2. Check HOD approval status
    if (application[0].hod_approval_status === 'approved') {
      return res.status(403).json({ 
        error: 'Cannot delete students from an approved application' 
      });
    }

    // 3. Delete the student from application
    const [result] = await connection.query(
      `DELETE FROM application_students 
       WHERE application_id = ? AND regno = ?`,
      [applicationId, regno]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'Student not found in application' 
      });
    }

    await connection.commit();
    res.status(200).json({ 
      message: 'Student removed from application successfully' 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};

export const addStudentsToApplication = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { applicationId } = req.params;
    const { students } = req.body;
    const studentRegno = req.user.user_id;

    // Step 1: Verify application ownership and check HOD approval status
    const [application] = await connection.query(
      `SELECT id, applied_by, hod_approval_status 
       FROM applications 
       WHERE id = ? AND applied_by = ?`,
      [applicationId, studentRegno]
    );

    if (application.length === 0) {
      return res.status(404).json({ 
        error: 'Application not found or unauthorized access' 
      });
    }

    // Step 2: Check if HOD approval status is "approved"
    if (application[0].hod_approval_status === 'approved') {
      return res.status(403).json({ 
        error: 'Cannot add students to an approved application' 
      });
    }

    // Step 3: Get existing students to avoid duplicates
    const [existingStudents] = await connection.query(
      `SELECT regno FROM application_students 
       WHERE application_id = ?`,
      [applicationId]
    );

    const existingRegnos = existingStudents.map(s => s.regno);
    
    // Step 4: Prepare new students data
    const newStudents = students
      .filter(regno => !existingRegnos.includes(regno))
      .map(regno => [
        applicationId,
        regno,
        'pending'
      ]);

    if (newStudents.length === 0) {
      return res.status(400).json({ 
        error: 'No new valid students to add' 
      });
    }

    // Step 5: Insert new students
    await connection.query(
      `INSERT INTO application_students 
       (application_id, regno, mentor_approval_status)
       VALUES ?`,
      [newStudents]
    );

    await connection.commit();
    res.status(200).json({ 
      message: 'Students added successfully',
      addedCount: newStudents.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding students:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};