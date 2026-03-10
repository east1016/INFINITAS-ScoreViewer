import { useState } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
  Collapse, Button, IconButton, Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FilterList, FilterListOff } from '@mui/icons-material';
import { FilterState } from '../types/Types';
import { simpleClearName } from '../constants/clearConstrains';
import { difficultyDetailKeys } from '../constants/difficultyConstrains';

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

const FilterPanel = ({ filters, onChange }: Props) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // ← スマホ判定

  const [open, setOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<FilterState>(filters);


  const handleApply = () => onChange(pendingFilters);

  // 共通スタイル（スマホでのサイズ感）
  const selectBaseSx = {
    '& .MuiSelect-select': {
      fontSize: isXs ? 13 : 14,
      py: isXs ? 1 : 1.25, // 内側の縦パディングを少しだけ詰める
    },
  } as const;

  const menuProps = {
    PaperProps: {
      sx: {
        maxHeight: isXs ? 280 : 360,
        '& .MuiMenuItem-root': {
          fontSize: isXs ? 13 : 14,
          minHeight: 'unset',
          py: 0.75,
        },
        '& .MuiCheckbox-root': { p: isXs ? 0.5 : 0.75 },
      },
    },
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => setOpen(!open)} size={isXs ? 'small' : 'medium'}>
          {open ? <FilterListOff fontSize={isXs ? 'small' : 'medium'} /> : <FilterList fontSize={isXs ? 'small' : 'medium'} />}
        </IconButton>
        <Typography
          variant="button"
          onClick={() => setOpen(!open)}
          sx={{ cursor: 'pointer', fontSize: isXs ? 12 : 13 }}
        >
          {open ? 'フィルターを閉じる' : 'フィルターを開く'}
        </Typography>
      </Box>

      <Collapse in={open}>
        {/* クリアランプ */}
        <FormControl fullWidth sx={{ mb: 2 }} size={isXs ? 'small' : 'medium'}>
          <InputLabel sx={{ fontSize: isXs ? 12 : 14 }}>クリアランプ</InputLabel>
          <Select
            multiple
            value={pendingFilters?.cleartype || []}
            onChange={(e) => setPendingFilters({ ...pendingFilters, cleartype: e.target.value as number[] })}
            renderValue={(selected) => (selected as number[]).map((v) => simpleClearName[v]).join(', ')}
            size={isXs ? 'small' : 'medium'}
            MenuProps={menuProps}
            sx={selectBaseSx}
          >
            {simpleClearName.map((label, index) => (
              <MenuItem key={index} value={index}>
                <Checkbox checked={pendingFilters?.cleartype?.includes(index) || false} />
                <ListItemText primaryTypographyProps={{ fontSize: isXs ? 13 : 14 }} primary={label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 譜面難易度  */}
        <FormControl fullWidth sx={{ mb: 2 }} size={isXs ? 'small' : 'medium'}>
          <InputLabel sx={{ fontSize: isXs ? 12 : 14 }}>譜面難易度</InputLabel>
          <Select
            multiple
            value={pendingFilters?.difficultyPattern || []}
            onChange={(e) => setPendingFilters({ ...pendingFilters, difficultyPattern: e.target.value as number[] })}
            renderValue={(selected) => (selected as number[]).map((v) => difficultyDetailKeys[v]).join(', ')}
            size={isXs ? 'small' : 'medium'}
            MenuProps={menuProps}
            sx={selectBaseSx}
          >
            {difficultyDetailKeys.map((label, index) => (
              <MenuItem key={index} value={index}>
                <Checkbox checked={pendingFilters?.difficultyPattern?.includes(index) || false} />
                <ListItemText primaryTypographyProps={{ fontSize: isXs ? 13 : 14 }} primary={label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box textAlign="right">
          <Button
            variant="contained"
            size={isXs ? 'small' : 'medium'}
            onClick={handleApply}
            sx={{ fontSize: isXs ? 12 : 14, fontWeight: 700 }}
          >
            フィルターを適用
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
};

export default FilterPanel;
