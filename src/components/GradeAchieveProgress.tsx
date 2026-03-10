import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { scoreColorMap } from '../constants/colorConstrains';
import { achiveTargetGradeMap } from '../utils/lampUtils';

interface GradeAchieveProgressProps {
  stats: Record<string, number>;
  totalCount: number;
}

const GradeAchieveProgress: React.FC<GradeAchieveProgressProps> = ({ stats, totalCount }) => {
  return (
    <Box sx={{ my: 2 }}>
      {Object.keys(achiveTargetGradeMap).map((key) => (
        <Box key={key} sx={{ mb: 1 }}>
          <Typography variant="body1">
            {key}達成率: {totalCount > 0 ? ((stats[key] / totalCount) * 100).toFixed(1) : '0.0'}% ({stats[key]}/{totalCount})
          </Typography>
          <LinearProgress
            variant="determinate"
            value={totalCount > 0 ? (stats[key] / totalCount) * 100 : 0}
            sx={{
              backgroundColor: '#eee',
              '& .MuiLinearProgress-bar': {
                backgroundColor: scoreColorMap[key] || '#2196f3'
              }
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default GradeAchieveProgress;
