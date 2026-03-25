# How to Use Attendance Scanning System

## Overview
The attendance scanning system allows teachers to efficiently take student attendance using QR codes. The system includes geofencing, time validation, and offline support for maximum reliability.

## Prerequisites
1. **Device Requirements**: Smartphone or tablet with camera access
2. **Browser**: Modern browser with camera permissions (Chrome, Safari, Firefox)
3. **Location Services**: GPS enabled for geofencing validation
4. **Time Zone**: Device time should be accurate

## Step-by-Step Guide

### 1. Access the Attendance Page
- Log in as a teacher
- Navigate to your teacher dashboard
- Click on a class to take attendance
- You'll be redirected to the attendance page for that class

### 2. Check System Status
Before starting, verify these indicators:
- **🟢 Online**: System is connected to the internet
- **📍 Within School Area**: You're within the school geofence (500m radius)
- **🕐 Valid Time**: Current time is between 7:00 AM and 6:00 PM

⚠️ **Important**: Attendance cannot be marked if you're outside the school area or outside valid hours.

### 3. Manual Attendance Marking
You can mark attendance manually using checkboxes:

1. **Present Checkbox**: Check the box next to a student's name to mark them present
2. **Status Dropdown**: Use the dropdown to set Present, Absent, or Late status
3. **Real-time Updates**: Changes are saved automatically to local storage

### 4. QR Code Scanning Process

#### For Students:
Each student needs a QR code containing their student ID. QR codes can be:
- Generated automatically by the system
- Printed on student ID cards
- Displayed on student mobile devices

#### For Teachers:
1. **Start Scanning**: Click the "📱 Start QR Scan" button
2. **Camera Access**: Allow camera permissions when prompted
3. **Position Camera**: Point the camera at the student's QR code
4. **Automatic Detection**: The system will automatically:
   - Read the QR code
   - Identify the student
   - Mark them as present
   - Show success feedback (green flash + vibration)

#### Scanning Features:
- **Visual Feedback**: Green screen flash for successful scans
- **Haptic Feedback**: Device vibration confirms successful scan
- **Error Handling**: Red flash and triple vibration for errors
- **Validation Checks**: Automatically validates location and time

### 5. Progress Tracking
- **Progress Bar**: Shows percentage of students marked present
- **Counter**: Displays "X of Y students present"
- **Color Coding**:
  - 🟢 Green: Present students
  - 🟡 Yellow: Late students
  - ⚪ Gray: Absent students

### 6. Offline Functionality
The system works offline:
- **Local Storage**: Attendance data saved locally
- **Sync Indicator**: Shows number of records pending sync
- **Background Sync**: Automatically syncs when connection is restored

### 7. Submit Attendance
1. **Review Records**: Check all attendance records are correct
2. **Submit Button**: Click "💾 Submit Attendance"
3. **Data Included**:
   - Student attendance status
   - Timestamp
   - Location coordinates (if available)
   - Geofencing validation status
   - Time validation status

## Troubleshooting

### Common Issues:

#### "Outside School Area" Warning
- **Cause**: You're more than 500 meters from school
- **Solution**: Move closer to school premises
- **Workaround**: Use manual marking (validation warnings will be recorded)

#### "Outside Attendance Hours" Warning
- **Cause**: Time is before 7:00 AM or after 6:00 PM
- **Solution**: Wait for valid attendance hours
- **Workaround**: Manual marking (time validation recorded)

#### Camera Not Working
- **Check Permissions**: Ensure camera access is granted
- **Browser Support**: Use Chrome, Safari, or Firefox
- **Device Compatibility**: Ensure device has a working camera

#### QR Code Not Scanning
- **Lighting**: Ensure good lighting
- **Distance**: Hold device 6-12 inches from QR code
- **Quality**: QR code should be clear and undamaged
- **Angle**: Keep QR code level with camera

#### Location Services Disabled
- **Enable GPS**: Turn on location services in device settings
- **Browser Permissions**: Allow location access when prompted
- **Accuracy**: Wait for GPS to get accurate location

## Best Practices

### For Teachers:
1. **Pre-Class Setup**: Check location and time validation before class starts
2. **Student Preparation**: Ensure students have QR codes ready
3. **Orderly Process**: Have students scan one at a time to avoid confusion
4. **Backup Method**: Use manual marking as backup for scanning issues
5. **Regular Sync**: Submit attendance regularly to avoid data loss

### For Students:
1. **QR Code Access**: Keep QR code easily accessible
2. **Device Ready**: Ensure device battery is charged
3. **Timely Arrival**: Arrive on time for valid attendance hours
4. **Code Quality**: Keep QR code clean and undamaged

## Security Features

- **Geofencing**: Prevents attendance marking from outside school premises
- **Time Validation**: Ensures attendance is only taken during school hours
- **Location Tracking**: Records GPS coordinates for audit purposes
- **Validation Logs**: All validation checks are recorded with attendance data

## Support

If you encounter issues:
1. Check browser console for error messages
2. Verify device permissions (camera, location)
3. Try refreshing the page
4. Contact system administrator for technical support

---

**Note**: This system is designed for educational institutions to maintain accurate attendance records while ensuring security and validation of attendance data.