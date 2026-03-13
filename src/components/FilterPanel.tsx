import {
  Box, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText,
  FormLabel, RadioGroup, FormControlLabel, Radio, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FilterState } from '../types/Types';
import { simpleClearName } from '../constants/clearConstrains';
import { difficultyDetailKeys } from '../constants/difficultyConstrains';

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  showLevelFilter?: boolean;
};

const FilterPanel = ({ filters, onChange, showLevelFilter = true }: Props) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const selectBaseSx = {
    '& .MuiSelect-select': {
      fontSize: isXs ? 13 : 14,
      py: isXs ? 1 : 1.25,
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
      {/* レベル */}
      {showLevelFilter && (
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend" sx={{ fontSize: isXs ? 12 : 14 }}>レベル</FormLabel>
          <RadioGroup
            row
            value={filters?.level ?? 12}
            onChange={(e) => onChange({ ...filters, level: parseInt(e.target.value) })}
          >
            {Array.from({ length: 12 }, (_, i) => 12 - i).map((lv) => (
              <FormControlLabel
                key={lv}
                value={lv}
                control={<Radio size={isXs ? 'small' : 'medium'} />}
                label={`☆${lv}`}
                sx={{ '& .MuiFormControlLabel-label': { fontSize: isXs ? 12 : 14 } }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      )}

      <Grid container spacing={2}>
        {/* クリアランプ */}
        <Grid item xs={12} sm={showLevelFilter ? 12 : 6}>
          <FormControl fullWidth size={isXs ? 'small' : 'medium'}>
            <InputLabel sx={{ fontSize: isXs ? 12 : 14 }}>クリアランプ</InputLabel>
            <Select
              multiple
              value={filters?.cleartype || []}
              onChange={(e) => onChange({ ...filters, cleartype: e.target.value as number[] })}
              renderValue={(selected) => (selected as number[]).map((v) => simpleClearName[v]).join(', ')}
              size={isXs ? 'small' : 'medium'}
              MenuProps={menuProps}
              sx={selectBaseSx}
            >
              {simpleClearName.map((label, index) => (
                <MenuItem key={index} value={index}>
                  <Checkbox checked={filters?.cleartype?.includes(index) || false} />
                  <ListItemText primaryTypographyProps={{ fontSize: isXs ? 13 : 14 }} primary={label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* 譜面難易度  */}
        <Grid item xs={12} sm={showLevelFilter ? 12 : 6}>
          <FormControl fullWidth size={isXs ? 'small' : 'medium'}>
            <InputLabel sx={{ fontSize: isXs ? 12 : 14 }}>譜面難易度</InputLabel>
            <Select
              multiple
              value={filters?.difficultyPattern || []}
              onChange={(e) => onChange({ ...filters, difficultyPattern: e.target.value as number[] })}
              renderValue={(selected) => (selected as number[]).map((v) => difficultyDetailKeys[v]).join(', ')}
              size={isXs ? 'small' : 'medium'}
              MenuProps={menuProps}
              sx={selectBaseSx}
            >
              {difficultyDetailKeys.map((label, index) => (
                <MenuItem key={index} value={index}>
                  <Checkbox checked={filters?.difficultyPattern?.includes(index) || false} />
                  <ListItemText primaryTypographyProps={{ fontSize: isXs ? 13 : 14 }} primary={label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FilterPanel;
