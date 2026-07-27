'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Filter, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface FilterOptions {
  ageRange: [number, number]
  distance: number
  onlineOnly: boolean
  status: 'all' | 'single' | 'couple'
  orientation: 'all' | 'hetero' | 'homo' | 'bi'
  meetingTypes: {
    friendly: boolean
    romantic: boolean
    playful: boolean
    openCurtains: boolean
    libertine: boolean
  }
  curtainPreference: 'all' | 'open' | 'closed'
}

export const defaultFilters: FilterOptions = {
  ageRange: [18, 50],
  distance: 50,
  onlineOnly: false,
  status: 'all',
  orientation: 'all',
  meetingTypes: {
    friendly: false,
    romantic: false,
    playful: false,
    openCurtains: false,
    libertine: false
  },
  curtainPreference: 'all'
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterOptions) => void
  value?: FilterOptions
}

export function AdvancedFilters ({ onFilterChange, value }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>(value || defaultFilters)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (value) setFilters(value)
  }, [value])

  const updateFilters = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const updateMeetingType = (
    type: keyof FilterOptions['meetingTypes'],
    value: boolean
  ) => {
    const newMeetingTypes = { ...filters.meetingTypes, [type]: value }
    updateFilters('meetingTypes', newMeetingTypes)
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  // Compter le nombre de filtres actifs
  const getActiveFilterCount = (): number => {
    let count = 0

    if (filters.onlineOnly) count++
    if (filters.status !== 'all') count++
    if (filters.orientation !== 'all') count++
    if (filters.curtainPreference !== 'all') count++

    // Compter les types de rencontres actifs
    Object.values(filters.meetingTypes).forEach(value => {
      if (value) count++
    })

    // Vérifier si l'âge a été modifié
    if (
      filters.ageRange[0] !== defaultFilters.ageRange[0] ||
      filters.ageRange[1] !== defaultFilters.ageRange[1]
    ) {
      count++
    }

    // Vérifier si la distance a été modifiée
    if (filters.distance !== defaultFilters.distance) {
      count++
    }

    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='flex-shrink-0 border-purple-800/30 bg-[#2d1155]/50 relative'
        >
          <Filter className='h-4 w-4' />
          {activeFilterCount > 0 && (
            <Badge className='absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-[#ff3b8b]'>
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 bg-[#2d1155] border-purple-800/30 p-4 text-white'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-semibold'>Filtres avancés</h3>
          <Button
            variant='ghost'
            size='sm'
            onClick={resetFilters}
            className='h-8 px-2 text-xs text-purple-200 hover:text-white hover:bg-purple-900/50'
          >
            Réinitialiser
            <X className='ml-1 h-3 w-3' />
          </Button>
        </div>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm'>Âge</Label>
              <span className='text-xs text-purple-200'>
                {filters.ageRange[0]} - {filters.ageRange[1]} ans
              </span>
            </div>
            <Slider
              defaultValue={filters.ageRange}
              min={18}
              max={80}
              step={1}
              value={filters.ageRange}
              onValueChange={value => updateFilters('ageRange', value)}
              className='[&>span]:bg-[#ff3b8b]'
            />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm'>Distance max</Label>
              <span className='text-xs text-purple-200'>
                {filters.distance} km
              </span>
            </div>
            <Slider
              defaultValue={[filters.distance]}
              min={5}
              max={100}
              step={5}
              value={[filters.distance]}
              onValueChange={value => updateFilters('distance', value[0])}
              className='[&>span]:bg-[#ff3b8b]'
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='online-only' className='text-sm'>
              En ligne uniquement
            </Label>
            <Switch
              id='online-only'
              checked={filters.onlineOnly}
              onCheckedChange={checked => updateFilters('onlineOnly', checked)}
              className='data-[state=checked]:bg-[#ff3b8b]'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Statut</Label>
            <RadioGroup
              value={filters.status}
              onValueChange={value => updateFilters('status', value)}
              className='flex gap-2'
            >
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='all'
                  id='status-all'
                  className='border-purple-500'
                />
                <Label htmlFor='status-all' className='text-xs cursor-pointer'>
                  Tous
                </Label>
              </div>
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='single'
                  id='status-single'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='status-single'
                  className='text-xs cursor-pointer'
                >
                  Célibataires
                </Label>
              </div>
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='couple'
                  id='status-couple'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='status-couple'
                  className='text-xs cursor-pointer'
                >
                  Couples
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Orientation</Label>
            <RadioGroup
              value={filters.orientation}
              onValueChange={value => updateFilters('orientation', value)}
              className='flex flex-wrap gap-2'
            >
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='all'
                  id='orientation-all'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='orientation-all'
                  className='text-xs cursor-pointer'
                >
                  Toutes
                </Label>
              </div>
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='hetero'
                  id='orientation-hetero'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='orientation-hetero'
                  className='text-xs cursor-pointer'
                >
                  Hétéro
                </Label>
              </div>
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='homo'
                  id='orientation-homo'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='orientation-homo'
                  className='text-xs cursor-pointer'
                >
                  Homo
                </Label>
              </div>
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='bi'
                  id='orientation-bi'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='orientation-bi'
                  className='text-xs cursor-pointer'
                >
                  Bi
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Types de rencontres</Label>
            <div className='grid grid-cols-2 gap-2'>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='type-friendly'
                  checked={filters.meetingTypes.friendly}
                  onCheckedChange={checked =>
                    updateMeetingType('friendly', checked)
                  }
                  className='data-[state=checked]:bg-[#ff3b8b]'
                />
                <Label
                  htmlFor='type-friendly'
                  className='text-xs cursor-pointer'
                >
                  Amicales
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='type-romantic'
                  checked={filters.meetingTypes.romantic}
                  onCheckedChange={checked =>
                    updateMeetingType('romantic', checked)
                  }
                  className='data-[state=checked]:bg-[#ff3b8b]'
                />
                <Label
                  htmlFor='type-romantic'
                  className='text-xs cursor-pointer'
                >
                  Romantiques
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='type-playful'
                  checked={filters.meetingTypes.playful}
                  onCheckedChange={checked =>
                    updateMeetingType('playful', checked)
                  }
                  className='data-[state=checked]:bg-[#ff3b8b]'
                />
                <Label
                  htmlFor='type-playful'
                  className='text-xs cursor-pointer'
                >
                  Ludiques
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='type-openCurtains'
                  checked={filters.meetingTypes.openCurtains}
                  onCheckedChange={checked =>
                    updateMeetingType('openCurtains', checked)
                  }
                  className='data-[state=checked]:bg-[#ff3b8b]'
                />
                <Label
                  htmlFor='type-openCurtains'
                  className='text-xs cursor-pointer'
                >
                  Rideaux ouverts
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Switch
                  id='type-libertine'
                  checked={filters.meetingTypes.libertine}
                  onCheckedChange={checked =>
                    updateMeetingType('libertine', checked)
                  }
                  className='data-[state=checked]:bg-[#ff3b8b]'
                />
                <Label
                  htmlFor='type-libertine'
                  className='text-xs cursor-pointer'
                >
                  Libertines
                </Label>
              </div>
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Préférence rideau</Label>
            <RadioGroup
              value={filters.curtainPreference}
              onValueChange={value => updateFilters('curtainPreference', value)}
              className='flex gap-2'
            >
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='all'
                  id='curtain-all'
                  className='border-purple-500'
                />
                <Label htmlFor='curtain-all' className='text-xs cursor-pointer'>
                  Tous
                </Label>
              </div>
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='open'
                  id='curtain-open'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='curtain-open'
                  className='text-xs cursor-pointer'
                >
                  Ouvert
                </Label>
              </div>
              <div className='flex items-center space-x-1 rounded-md border border-purple-800/50 p-2 bg-purple-900/20'>
                <RadioGroupItem
                  value='closed'
                  id='curtain-closed'
                  className='border-purple-500'
                />
                <Label
                  htmlFor='curtain-closed'
                  className='text-xs cursor-pointer'
                >
                  Fermé
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={() => setOpen(false)}
            className='w-full bg-gradient-to-r from-[#ff3b8b] to-[#ff8cc8] hover:from-[#ff3b8b]/90 hover:to-[#ff8cc8]/90 text-white border-0'
          >
            Appliquer les filtres
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
