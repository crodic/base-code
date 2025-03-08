import useTokenPayload from '@/hooks/use-token-payload'
import { Navigate, Outlet } from 'react-router'

interface Props {
    requiredRoles?: string[]
}

export default function AuthorizedRoute({ requiredRoles = [] }: Props) {
    const payload = useTokenPayload()
    if (!payload) {
        return <Navigate to="/auth/login" />
    }

    const { role } = payload
    if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
        return <Navigate to="/unauthorized" />
    }

    return <Outlet />
}
