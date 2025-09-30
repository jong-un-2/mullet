import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Typography,
  Container,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Savings as XFundIcon,
  KeyboardArrowDown as ArrowDownIcon,
  TrendingUp as StockIcon,
  Water as LiquidIcon,
  BusinessCenter as BusinessIcon,
} from '@mui/icons-material';
import CustomUserProfile from './CustomUserProfile';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navigationItems = [
    { name: 'X Fund', path: '/xfund', icon: <XFundIcon /> },
    { name: 'X Stock', path: '/xstock', icon: <StockIcon /> },
    { name: 'X Liquid', path: '/xliquid', icon: <LiquidIcon /> },
    { name: 'Portfolio', path: '/portfolio', icon: <BusinessIcon /> },
    { name: 'More', path: '/more', icon: <ArrowDownIcon /> },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ width: 250, pt: 2 }}>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                backgroundColor: location.pathname === item.path ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
                color: location.pathname === item.path ? '#ffffff' : '#94a3b8',
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                '&:hover': {
                  backgroundColor: location.pathname === item.path ? 'rgba(59, 130, 246, 0.9)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                },
              }}
            >
              {item.icon}
              <ListItemText primary={item.name} sx={{ ml: 1 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    mr: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Tech-styled logo background */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      background: 'linear-gradient(45deg, #3b82f6 0%, #1e40af 50%, #34d399 100%)',
                      borderRadius: '8px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                    }}
                  >
                    {/* Tech accent circle */}
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: '50%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* White diagonal slash */}
                      <Box
                        sx={{
                          width: 16,
                          height: 2,
                          backgroundColor: '#ffffff',
                          borderRadius: '1px',
                          transform: 'rotate(45deg)',
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{
                    fontWeight: 700,
                    background: 'linear-gradient(45deg, #ffffff 0%, #3b82f6 50%, #34d399 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Mars Liquid
                </Typography>
              </Box>

              {!isMobile && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {navigationItems.map((item) => (
                    <Button
                      key={item.name}
                      startIcon={item.name !== 'More' ? item.icon : undefined}
                      endIcon={item.name === 'More' ? item.icon : undefined}
                      onClick={() => navigate(item.path)}
                      variant={location.pathname === item.path ? 'contained' : 'text'}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 2,
                        py: 1,
                        color: location.pathname === item.path ? '#ffffff' : '#94a3b8',
                        backgroundColor: location.pathname === item.path 
                          ? 'rgba(59, 130, 246, 0.8)' 
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: location.pathname === item.path 
                            ? 'rgba(59, 130, 246, 0.9)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                        },
                        borderRadius: 2,
                      }}
                    >
                      {item.name}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CustomUserProfile />
              {isMobile && (
                <IconButton
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ color: '#94a3b8' }}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {isMobile && (
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 250,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(10px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
};

export default Navigation;
