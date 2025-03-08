import useSession from '@/stores/use-session'
import { ROLES } from '@/utils/constants'
import { jwtDecode } from 'jwt-decode'

export default function useTokenPayload() {
    const token = useSession((state) => state.accessToken)
    if (!token) return null

    try {
        const payload = jwtDecode<{ id: string; role: ROLES }>(token)
        return payload
    } catch (error) {
        console.error(error)
        return null
    }
}
