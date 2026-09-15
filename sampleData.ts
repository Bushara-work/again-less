export function createSampleFiles(): File[] {
  const file1Content = `SNo,Participant Name,Class Date,Attended Duration,Attendance Started at,Joined at(beta),Attendance Stopped at,Meeting code
1,Alice Johnson,12-May-2024,45 mins,09:00 AM,09:02 AM,10:00 AM,eng-math-101
2,Bob Smith,12-May-2024,35 mins,09:00 AM,09:10 AM,10:00 AM,eng-math-101
3,Charlie Brown,12-May-2024,15 mins,09:00 AM,09:40 AM,10:00 AM,eng-math-101
4,Diana Prince,12-May-2024,55 mins,09:00 AM,09:00 AM,10:00 AM,eng-math-101
5,Evan Wright,12-May-2024,0 mins,09:00 AM,,10:00 AM,eng-math-101
6,Alice Johnson,12-May-2024,45 mins,09:00 AM,09:02 AM,10:00 AM,eng-math-101
`;

  const file2Content = `SNo,Participant Name,Class Date,Attended Duration,Attendance Started at,Joined at(beta),Attendance Stopped at,Meeting code
1,Alice Johnson,13-May-2024,50 mins,09:00 AM,09:01 AM,10:00 AM,eng-math-101
2,Bob Smith,13-May-2024,20 mins,09:00 AM,09:25 AM,10:00 AM,eng-math-101
3,Charlie Brown,13-May-2024,40 mins,09:00 AM,09:05 AM,10:00 AM,eng-math-101
4,Diana Prince,13-May-2024,60 mins,09:00 AM,08:59 AM,10:00 AM,eng-math-101
5,Evan Wright,13-May-2024,30 mins,09:00 AM,09:15 AM,10:00 AM,eng-math-101
`;

  const file3Content = `SNo,Participant Name,Class Date,Attended Duration,Attendance Started at,Joined at(beta),Attendance Stopped at,Meeting code
1,Alice Johnson,14-May-2024,45 mins,09:00 AM,09:00 AM,10:00 AM,eng-math-101
2,Bob Smith,14-May-2024,45 mins,09:00 AM,09:05 AM,10:00 AM,eng-math-101
3,Charlie Brown,14-May-2024,10 mins,09:00 AM,09:45 AM,10:00 AM,eng-math-101
4,Diana Prince,14-May-2024,50 mins,09:00 AM,09:03 AM,10:00 AM,eng-math-101
5,Evan Wright,14-May-2024,45 mins,09:00 AM,09:02 AM,10:00 AM,eng-math-101
`;

  const file1 = new File([file1Content], 'Attendance (12-May-2024).csv', { type: 'text/csv' });
  const file2 = new File([file2Content], 'Attendance (13-May-2024).csv', { type: 'text/csv' });
  const file3 = new File([file3Content], 'Attendance (14-May-2024).csv', { type: 'text/csv' });

  return [file1, file2, file3];
}
